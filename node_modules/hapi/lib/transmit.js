// Load modules

var Http = require('http');
var Stream = require('stream');
var Zlib = require('zlib');
var Ammo = require('ammo');
var Boom = require('boom');
var Hoek = require('hoek');
var Items = require('items');
var Shot = require('shot');
var Auth = require('./auth');
var Response = require('./response');


// Declare internals

var internals = {};


exports.send = function (request, callback) {

    var response = request.response;
    if (response.isBoom) {
        return internals.fail(request, response, callback);
    }

    internals.marshal(request, function (err) {

        if (err) {
            request._setResponse(err);
            return internals.fail(request, err, callback);
        }

        return internals.transmit(response, callback);
    });
};


internals.marshal = function (request, next) {

    var response = request.response;

    internals.cors(response);
    internals.content(response);
    internals.security(response);

    if (response.statusCode !== 304 &&
        (request.method === 'get' || request.method === 'head')) {

        if (response.headers.etag &&
            request.headers['if-none-match']) {

            // Strong verifier

            var ifNoneMatch = request.headers['if-none-match'].split(/\s*,\s*/);
            for (var i = 0, il = ifNoneMatch.length; i < il; ++i) {
                var etag = ifNoneMatch[i];
                if (etag === response.headers.etag) {
                    response.code(304);
                    break;
                }
                else if (response.settings.varyEtag) {
                    var etagBase = response.headers.etag.slice(0, -1);
                    if (etag === etagBase + '-gzip"' ||
                        etag === etagBase + '-deflate"') {

                        response.headers.etag = etag;
                        response.code(304);
                        break;
                    }
                }
            }
        }
        else {
            var ifModifiedSinceHeader = request.headers['if-modified-since'];
            var lastModifiedHeader = response.headers['last-modified'];

            if (ifModifiedSinceHeader &&
                lastModifiedHeader) {

                // Weak verifier

                var ifModifiedSince = Date.parse(ifModifiedSinceHeader);
                var lastModified = Date.parse(lastModifiedHeader);

                if (ifModifiedSince &&
                    lastModified &&
                    ifModifiedSince >= lastModified) {

                    response.code(304);
                }
            }
        }
    }

    internals.state(response, function (err) {

        if (err) {
            request._log(['state', 'response', 'error'], err);
            request._states = {};                                           // Clear broken state
            return next(err);
        }

        internals.cache(response);

        if (!response._isPayloadSupported()) {

            // Close unused file streams

            response._close();

            // Set empty stream

            response._payload = new internals.Empty();
            if (request.method !== 'head') {
                delete response.headers['content-length'];
            }

            return Auth.response(request, next);               // Must be last in case requires access to headers
        }

        response._marshal(function (err) {

            if (err) {
                return next(Boom.wrap(err));
            }

            if (request.jsonp &&
                response._payload.jsonp) {

                response._header('content-type', 'text/javascript' + (response.settings.charset ? '; charset=' + response.settings.charset : ''));
                response._header('x-content-type-options', 'nosniff');
                response._payload.jsonp(request.jsonp);
            }

            if (response._payload.size &&
                typeof response._payload.size === 'function') {

                response._header('content-length', response._payload.size(), { override: false });
            }

            return Auth.response(request, next);               // Must be last in case requires access to headers
        });
    });
};


internals.fail = function (request, boom, callback) {

    var error = boom.output;
    var response = new Response(error.payload, request);
    response._error = boom;
    response.code(error.statusCode);
    response.headers = error.headers;
    request.response = response;                            // Not using request._setResponse() to avoid double log

    internals.marshal(request, function (err) {

        if (err) {

            // Failed to marshal an error - replace with minimal representation of original error

            var minimal = {
                statusCode: error.statusCode,
                error: Http.STATUS_CODES[error.statusCode],
                message: boom.message
            };

            response._payload = new Response.Payload(JSON.stringify(minimal), {});
        }

        return internals.transmit(response, callback);
    });
};


internals.transmit = function (response, callback) {

    // Setup source

    var request = response.request;
    var source = response._payload;
    var length = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : 0;      // In case value is a string

    // Compression

    var mime = request.server.mime.type(response.headers['content-type'] || 'application/octet-stream');
    var encoding = (mime.compressible && !response.headers['content-encoding'] ? request.info.acceptEncoding : null);
    encoding = (encoding === 'identity' ? null : encoding);

    // Range

    if (request.method === 'get' &&
        response.statusCode === 200 &&
        length &&
        !encoding) {

        if (request.headers.range) {

            // Check If-Range

            if (!request.headers['if-range'] ||
                request.headers['if-range'] === response.headers.etag) {            // Ignoring last-modified date (weak)

                // Parse header

                var ranges = Ammo.header(request.headers.range, length);
                if (!ranges) {
                    var error = Boom.rangeNotSatisfiable();
                    error.output.headers['content-range'] = 'bytes */' + length;
                    return internals.fail(request, error, callback);
                }

                // Prepare transform

                if (ranges.length === 1) {                                          // Ignore requests for multiple ranges
                    var range = ranges[0];
                    var ranger = new Ammo.Stream(range);
                    response.code(206);
                    response.bytes(range.to - range.from + 1);
                    response._header('content-range', 'bytes ' + range.from + '-' + range.to + '/' + length);
                }
            }
        }

        response._header('accept-ranges', 'bytes');
    }

    // Content-Encoding

    if (encoding &&
        length &&
        response._isPayloadSupported()) {

        delete response.headers['content-length'];
        response._header('content-encoding', encoding);
        response.vary('accept-encoding');

        var compressor = (encoding === 'gzip' ? Zlib.createGzip() : Zlib.createDeflate());
    }

    if (response.headers['content-encoding'] &&
        response.headers.etag &&
        response.settings.varyEtag) {

        response.headers.etag = response.headers.etag.slice(0, -1) + '-' + response.headers['content-encoding'] + '"';
    }

    // Write headers

    var headers = Object.keys(response.headers);
    for (var h = 0, hl = headers.length; h < hl; ++h) {
        var header = headers[h];
        request.raw.res.setHeader(header, response.headers[header]);
    }

    request.raw.res.writeHead(response.statusCode);

    // Generate tap stream

    var tap = response._tap();

    // Write payload

    var hasEnded = false;
    var end = function (err, event) {

        if (!hasEnded) {
            hasEnded = true;

            if (event !== 'aborted') {
                request.raw.res.end();
            }

            source.removeListener('error', end);

            request.raw.req.removeListener('aborted', onAborted);
            request.raw.req.removeListener('close', onClose);

            request.raw.res.removeListener('close', onClose);
            request.raw.res.removeListener('error', end);
            request.raw.res.removeListener('finish', end);

            var tags = (err ? ['response', 'error']
                            : (event ? ['response', 'error', event]
                                     : ['response']));

            if (event || err) {
                request.emit('disconnect');
            }

            request._log(tags, err);
            callback();
        }
    };

    source.once('error', end);

    var onAborted = function () {

        end(null, 'aborted');
    };

    var onClose = function () {

        end(null, 'close');
    };

    request.raw.req.once('aborted', onAborted);
    request.raw.req.once('close', onClose);

    request.raw.res.once('close', onClose);
    request.raw.res.once('error', end);
    request.raw.res.once('finish', end);

    var preview = (tap ? source.pipe(tap) : source);
    var compressed = (compressor ? preview.pipe(compressor) : preview);
    var ranged = (ranger ? compressed.pipe(ranger) : compressed);
    ranged.pipe(request.raw.res);

    // Injection

    if (Shot.isInjection(request.raw.req)) {
        request.raw.res._hapi = {
            request: request
        };

        if (response.variety === 'plain') {
            request.raw.res._hapi.result = response._isPayloadSupported() ? response.source : null;
        }
    }
};


internals.Empty = function () {

    Stream.Readable.call(this);
};

Hoek.inherits(internals.Empty, Stream.Readable);


internals.Empty.prototype._read = function (/* size */) {

    this.push(null);
};


internals.cors = function (response) {

    var request = response.request;
    var cors = request.route.settings.cors;
    if (cors) {
        if (cors._origin &&
            (!response.headers['access-control-allow-origin'] || cors.override)) {

            if (cors.matchOrigin) {
                response.vary('origin');
                if (internals.matchOrigin(request.headers.origin, cors)) {
                    response._header('access-control-allow-origin', request.headers.origin);
                }
                else if (cors.isOriginExposed) {
                    response._header('access-control-allow-origin', cors._origin.any ? '*' : cors._origin.qualifiedString);
                }
            }
            else if (cors._origin.any) {
                response._header('access-control-allow-origin', '*');
            }
            else {
                response._header('access-control-allow-origin', cors._origin.qualifiedString);
            }
        }

        response._header('access-control-max-age', cors.maxAge, { override: cors.override });
        response._header('access-control-allow-methods', cors._methods, { override: cors.override });
        response._header('access-control-allow-headers', cors._headers, { override: cors.override });

        if (cors._exposedHeaders.length !== 0) {
            response._header('access-control-expose-headers', cors._exposedHeaders, { override: cors.override });
        }

        if (cors.credentials) {
            response._header('access-control-allow-credentials', 'true', { override: cors.override });
        }
    }
};


internals.matchOrigin = function (origin, cors) {

    if (!origin) {
        return false;
    }

    if (cors._origin.any) {
        return true;
    }

    if (cors._origin.qualified.indexOf(origin) !== -1) {
        return true;
    }

    for (var i = 0, il = cors._origin.wildcards.length; i < il; ++i) {
        if (origin.match(cors._origin.wildcards[i])) {
            return true;
        }
    }

    return false;
};


internals.cache = function (response) {

    if (response.headers['cache-control']) {
        return;
    }

    var request = response.request;
    if ((request._route._cache && request.route.settings.cache._statuses[response.statusCode]) ||
        response.settings.ttl) {

        var ttl = (response.settings.ttl !== null ? response.settings.ttl : request._route._cache.ttl());
        var privacy = (request.auth.isAuthenticated || response.headers['set-cookie'] ? 'private' : request.route.settings.cache.privacy || 'default');
        response._header('cache-control', 'max-age=' + Math.floor(ttl / 1000) + ', must-revalidate' + (privacy !== 'default' ? ', ' + privacy : ''));
    }
    else {
        response._header('cache-control', 'no-cache');
    }
};


internals.security = function (response) {

    var request = response.request;

    var security = request.route.settings.security;
    if (security) {
        if (security._hsts) {
            response._header('strict-transport-security', security._hsts, { override: false });
        }

        if (security._xframe) {
            response._header('x-frame-options', security._xframe, { override: false });
        }

        if (security.xss) {
            response._header('x-xss-protection', '1; mode=block', { override: false });
        }

        if (security.noOpen) {
            response._header('x-download-options', 'noopen', { override: false });
        }

        if (security.noSniff) {
            response._header('x-content-type-options', 'nosniff', { override: false });
        }
    }
};


internals.content = function (response) {

    var type = response.headers['content-type'];
    if (!type) {
        var charset = (response.settings.charset ? '; charset=' + response.settings.charset : '');

        if (typeof response.source === 'string') {
            response.type('text/html' + charset);
        }
        else if (Buffer.isBuffer(response.source)) {
            response.type('application/octet-stream');
        }
        else if (response.variety === 'plain' &&
            response.source !== null) {

            response.type('application/json' + charset);
        }
    }
    else if (response.settings.charset &&
        type.match(/^(?:text\/)|(?:application\/(?:json)|(?:javascript))/)) {

        var hasParams = (type.indexOf(';') !== -1);
        if (!hasParams ||
            !type.match(/[; ]charset=/)) {

            response.type(type + (hasParams ? ', ' : '; ') + 'charset=' + (response.settings.charset));
        }
    }
};


internals.state = function (response, next) {

    var request = response.request;

    var names = {};
    var states = [];

    var keys = Object.keys(request._states);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var keyName = keys[i];
        names[keyName] = true;
        states.push(request._states[keyName]);
    }

    keys = Object.keys(request.connection.states.cookies);
    Items.parallel(keys, function (name, nextKey) {

        var autoValue = request.connection.states.cookies[name].autoValue;
        if (!autoValue || names[name]) {
            return nextKey();
        }

        names[name] = true;

        if (typeof autoValue !== 'function') {
            states.push({ name: name, value: autoValue });
            return nextKey();
        }

        autoValue(request, function (err, value) {

            if (err) {
                return nextKey(err);
            }

            states.push({ name: name, value: value });
            return nextKey();
        });
    },
    function (err) {

        if (err) {
            return next(Boom.wrap(err));
        }

        if (!states.length) {
            return next();
        }

        request.connection.states.format(states, function (err, header) {

            if (err) {
                return next(Boom.wrap(err));
            }

            var existing = response.headers['set-cookie'];
            if (existing) {
                header = (Array.isArray(existing) ? existing : [existing]).concat(header);
            }

            response._header('set-cookie', header);
            return next();
        });
    });
};
