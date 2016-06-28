// Load modules

var Stream = require('stream');
var Events = require('events');
var Boom = require('boom');
var Hoek = require('hoek');
var Peekaboo = require('peekaboo');


// Declare internals

var internals = {};


exports = module.exports = internals.Response = function (source, request, options) {

    Events.EventEmitter.call(this);

    options = options || {};

    this.request = request;
    this.statusCode = null;
    this.headers = {};                          // Incomplete as some headers are stored in flags
    this.variety = null;
    this.app = {};
    this.plugins = {};
    this.send = null;                           // Set by reply()
    this.hold = null;                           // Set by reply()

    this.settings = {
        encoding: 'utf8',
        charset: 'utf-8',                       // '-' required by IANA
        ttl: null,
        stringify: null,                        // JSON.stringify options
        passThrough: true,
        varyEtag: false
    };

    this._payload = null;                       // Readable stream
    this._takeover = false;
    this._contentEncoding = null;               // Set during transmit
    this._error = null;                         // The boom object when created from an error

    this._processors = {
        marshal: options.marshal,
        prepare: options.prepare,
        close: options.close
    };

    this._setSource(source, options.variety);
};

Hoek.inherits(internals.Response, Events.EventEmitter);


internals.Response.wrap = function (result, request) {

    return (result instanceof Error ? Boom.wrap(result)
                                    : (result instanceof internals.Response ? result
                                                                            : new internals.Response(result, request)));
};


internals.Response.prototype._setSource = function (source, variety) {

    // Method must not set any headers or other properties as source can change later

    this.variety = variety || 'plain';

    if (source === null ||
        source === undefined ||
        source === '') {

        source = null;
    }
    else if (Buffer.isBuffer(source)) {
        this.variety = 'buffer';
    }
    else if (source instanceof Stream) {
        this.variety = 'stream';
    }
    else if (typeof source === 'object' &&
        typeof source.then === 'function') {                // Promise object

        this.variety = 'promise';
    }

    this.source = source;
};


internals.Response.prototype.code = function (statusCode) {

    Hoek.assert(Hoek.isInteger(statusCode), 'Status code must be an integer');

    this.statusCode = statusCode;
    return this;
};


internals.Response.prototype.header = function (key, value, options) {

    key = key.toLowerCase();
    if (key === 'vary') {
        return this.vary(value);
    }

    return this._header(key, value, options);
};


internals.Response.prototype._header = function (key, value, options) {

    options = options || {};
    options.append = options.append || false;
    options.separator = options.separator || ',';
    options.override = options.override !== false;

    if ((!options.append && options.override) ||
        !this.headers[key]) {

        this.headers[key] = value;
    }
    else if (options.override) {
        if (key === 'set-cookie') {
            this.headers[key] = [].concat(this.headers[key], value);
        }
        else {
            this.headers[key] = this.headers[key] + options.separator + value;
        }
    }

    return this;
};


internals.Response.prototype.vary = function (value) {

    if (value === '*') {
        this.headers.vary = '*';
    }
    else if (!this.headers.vary) {
        this.headers.vary = value;
    }
    else if (this.headers.vary !== '*') {
        this._header('vary', value, { append: true });
    }

    return this;
};


internals.Response.prototype.etag = function (tag, options) {

    Hoek.assert(tag !== '*', 'ETag cannot be *');

    options = options || {};
    this._header('etag', (options.weak ? 'W/' : '') + '"' + tag + '"');
    this.settings.varyEtag = options.vary !== false && !options.weak;       // vary defaults to true
    return this;
};


internals.Response.prototype.type = function (type) {

    this._header('content-type', type);
    return this;
};


internals.Response.prototype.bytes = function (bytes) {

    this._header('content-length', bytes);
    return this;
};


internals.Response.prototype.location = function (uri) {

    this._header('location', uri);
    return this;
};


internals.Response.prototype.created = function (location) {

    Hoek.assert(this.request.method === 'post' || this.request.method === 'put', 'Cannot create resource on GET');

    this.statusCode = 201;
    this.location(location);
    return this;
};


internals.Response.prototype.replacer = function (method) {

    this.settings.stringify = this.settings.stringify || {};
    this.settings.stringify.replacer = method;
    return this;
};


internals.Response.prototype.spaces = function (count) {

    this.settings.stringify = this.settings.stringify || {};
    this.settings.stringify.space = count;
    return this;
};


internals.Response.prototype.suffix = function (suffix) {

    this.settings.stringify = this.settings.stringify || {};
    this.settings.stringify.suffix = suffix;
    return this;
};


internals.Response.prototype.passThrough = function (enabled) {

    this.settings.passThrough = (enabled !== false);    // Defaults to true
    return this;
};


internals.Response.prototype.redirect = function (location) {

    this.statusCode = 302;
    this.location(location);
    this.temporary = this._temporary;
    this.permanent = this._permanent;
    this.rewritable = this._rewritable;
    return this;
};


internals.Response.prototype._temporary = function (isTemporary) {

    this._setTemporary(isTemporary !== false);           // Defaults to true
    return this;
};


internals.Response.prototype._permanent = function (isPermanent) {

    this._setTemporary(isPermanent === false);           // Defaults to true
    return this;
};


internals.Response.prototype._rewritable = function (isRewritable) {

    this._setRewritable(isRewritable !== false);         // Defaults to true
    return this;
};


internals.Response.prototype._isTemporary = function () {

    return this.statusCode === 302 || this.statusCode === 307;
};


internals.Response.prototype._isRewritable = function () {

    return this.statusCode === 301 || this.statusCode === 302;
};


internals.Response.prototype._setTemporary = function (isTemporary) {

    if (isTemporary) {
        if (this._isRewritable()) {
            this.statusCode = 302;
        }
        else {
            this.statusCode = 307;
        }
    }
    else {
        if (this._isRewritable()) {
            this.statusCode = 301;
        }
        else {
            this.statusCode = 308;
        }
    }
};


internals.Response.prototype._setRewritable = function (isRewritable) {

    if (isRewritable) {
        if (this._isTemporary()) {
            this.statusCode = 302;
        }
        else {
            this.statusCode = 301;
        }
    }
    else {
        if (this._isTemporary()) {
            this.statusCode = 307;
        }
        else {
            this.statusCode = 308;
        }
    }
};


internals.Response.prototype.encoding = function (encoding) {

    this.settings.encoding = encoding;
    return this;
};


internals.Response.prototype.charset = function (charset) {

    this.settings.charset = charset || null;
    return this;
};


internals.Response.prototype.ttl = function (ttl) {

    this.settings.ttl = ttl;
    return this;
};


internals.Response.prototype.state = function (name, value, options) {          // options: see Defaults.state

    this.request._setState(name, value, options);
    return this;
};


internals.Response.prototype.unstate = function (name, options) {

    this.request._clearState(name, options);
    return this;
};


internals.Response.prototype.takeover = function () {

    this._takeover = true;
    return this;
};


internals.Response.prototype._prepare = function (data, next) {

    var self = this;

    this._passThrough();

    if (this.variety !== 'promise') {
        return this._processPrepare(data, next);
    }

    var onDone = function (source) {

        if (source instanceof Error) {
            return next(Boom.wrap(source), data);
        }

        if (source instanceof internals.Response) {
            return source._processPrepare(data, next);
        }

        self._setSource(source);
        self._passThrough();
        self._processPrepare(data, next);
    };

    this.source.then(onDone, onDone);
};


internals.Response.prototype._passThrough = function () {

    if (this.variety === 'stream' &&
        this.settings.passThrough) {

        if (this.source.statusCode &&
            !this.statusCode) {

            this.statusCode = this.source.statusCode;                        // Stream is an HTTP response
        }

        if (this.source.headers) {
            var headerKeys = Object.keys(this.source.headers);

            if (headerKeys.length) {
                var localHeaders = this.headers;
                this.headers = {};

                for (var i = 0, il = headerKeys.length; i < il; ++i) {
                    var key = headerKeys[i];
                    this.header(key.toLowerCase(), Hoek.clone(this.source.headers[key]));     // Clone arrays
                }

                headerKeys = Object.keys(localHeaders);
                for (i = 0, il = headerKeys.length; i < il; ++i) {
                    key = headerKeys[i];
                    this.header(key, localHeaders[key], { append: key === 'set-cookie' });
                }
            }
        }
    }

    this.statusCode = this.statusCode || 200;
};


internals.Response.prototype._processPrepare = function (data, next) {

    if (!this._processors.prepare) {
        return next(this, data);
    }

    this._processors.prepare(this, function (prepared) {

        return next(prepared, data);
    });
};


internals.Response.prototype._marshal = function (next) {

    var self = this;

    if (!this._processors.marshal) {
        return this._streamify(this.source, next);
    }

    this._processors.marshal(this, function (err, source) {

        if (err) {
            return next(err);
        }

        return self._streamify(source, next);
    });
};


internals.Response.prototype._streamify = function (source, next) {

    if (source instanceof Stream) {
        if (typeof source._read !== 'function' || typeof source._readableState !== 'object') {
            return next(Boom.badImplementation('Stream must have a streams2 readable interface'));
        }

        if (source._readableState.objectMode) {
            return next(Boom.badImplementation('Cannot reply with stream in object mode'));
        }

        this._payload = source;
        return next();
    }

    var payload = source;
    if (this.variety === 'plain' &&
        source !== null &&
        typeof source !== 'string') {

        var options = this.settings.stringify || {};
        var space = options.space || this.request.route.settings.json.space;
        var replacer = options.replacer || this.request.route.settings.json.replacer;
        var suffix = options.suffix || this.request.route.settings.json.suffix || '';
        try {
            payload = JSON.stringify(payload, replacer, space);
        }
        catch (err) {
            return next(err);
        }

        if (suffix) {
            payload += suffix;
        }
    }
    else if (this.settings.stringify) {
        return next(Boom.badImplementation('Cannot set formatting options on non object response'));
    }

    this._payload = new internals.Payload(payload, this.settings);
    return next();
};


internals.Response.prototype._tap = function () {

    return (this.listeners('finish').length || this.listeners('peek').length ? new Peekaboo(this) : null);
};


internals.Response.prototype._close = function () {

    if (this._processors.close) {
        this._processors.close(this);
    }

    var stream = this._payload || this.source;
    if (stream instanceof Stream) {
        if (stream.close) {
            stream.close();
        }
        else if (stream.destroy) {
            stream.destroy();
        }
        else {
            var read = function () {

                stream.read();
            };

            var end = function () {

                stream.removeListener('readable', read);
                stream.removeListener('error', end);
                stream.removeListener('end', end);
            };

            stream.on('readable', read);
            stream.once('error', end);
            stream.once('end', end);
        }
    }
};


internals.Response.prototype._isPayloadSupported = function () {

    return (this.request.method !== 'head' && this.statusCode !== 304 && this.statusCode !== 204);
};


internals.Response.Payload = internals.Payload = function (payload, options) {

    Stream.Readable.call(this);
    this._data = payload;
    this._prefix = null;
    this._suffix = null;
    this._sizeOffset = 0;
    this._encoding = options.encoding;
};

Hoek.inherits(internals.Payload, Stream.Readable);


internals.Payload.prototype._read = function (/* size */) {

    if (this._prefix) {
        this.push(this._prefix, this._encoding);
    }

    if (this._data) {
        this.push(this._data, this._encoding);
    }

    if (this._suffix) {
        this.push(this._suffix, this._encoding);
    }

    this.push(null);
};


internals.Payload.prototype.size = function () {

    if (!this._data) {
        return this._sizeOffset;
    }

    return (Buffer.isBuffer(this._data) ? this._data.length : Buffer.byteLength(this._data, this._encoding)) + this._sizeOffset;
};


internals.Payload.prototype.jsonp = function (variable) {

    this._sizeOffset += variable.length + 7;
    this._prefix = '/**/' + variable + '(';                 // '/**/' prefix prevents CVE-2014-4671 security exploit
    this._data = Buffer.isBuffer(this._data) ? this._data : this._data.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    this._suffix = ');';
};
