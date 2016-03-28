// Load modules

var Http = require('http');
var Https = require('https');
var Hoek = require('hoek');
var Joi = require('joi');
var Wreck = require('wreck');


// Declare internals

var internals = {
    agents: {}                                      // server.info.uri -> { http, https, insecure }
};


internals.defaults = {
    xforward: false,
    passThrough: false,
    redirects: false,
    timeout: 1000 * 60 * 3,                         // Timeout request after 3 minutes
    localStatePassThrough: false,                   // Pass cookies defined by the server upstream
    maxSockets: Infinity
};


internals.schema = Joi.object({
    host: Joi.string(),
    port: Joi.number().integer(),
    protocol: Joi.string().valid('http', 'https', 'http:', 'https:'),
    uri: Joi.string(),
    passThrough: Joi.boolean(),
    localStatePassThrough: Joi.boolean(),
    acceptEncoding: Joi.boolean().when('passThrough', { is: true, otherwise: Joi.forbidden() }),
    rejectUnauthorized: Joi.boolean(),
    xforward: Joi.boolean(),
    redirects: Joi.number().min(0).integer().allow(false),
    timeout: Joi.number().integer(),
    mapUri: Joi.func(),
    onResponse: Joi.func(),
    agent: Joi.object(),
    ttl: Joi.string().valid('upstream').allow(null),
    maxSockets: Joi.number().positive().allow(false)
})
    .xor('host', 'mapUri', 'uri')
    .without('mapUri', 'port', 'protocol')
    .without('uri', 'port', 'protocol');


exports.register = function (server, options, next) {

    server.handler('proxy', internals.handler);

    server.decorate('reply', 'proxy', function (options) {

        internals.handler(this.request.route, options)(this.request, this);
    });

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};


internals.handler = function (route, options) {

    Joi.assert(options, internals.schema, 'Invalid proxy handler options (' + route.path + ')');
    Hoek.assert(!route.settings.payload || ((route.settings.payload.output === 'data' || route.settings.payload.output === 'stream') && !route.settings.payload.parse), 'Cannot proxy if payload is parsed or if output is not stream or data');
    var settings = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['agent']);
    settings.mapUri = options.mapUri || internals.mapUri(options.protocol, options.host, options.port, options.uri);

    if (settings.ttl === 'upstream') {
        settings._upstreamTtl = true;
    }

    return function (request, reply) {

        settings.mapUri(request, function (err, uri, headers) {

            if (err) {
                return reply(err);
            }

            var protocol = uri.split(':', 1)[0];

            var options = {
                headers: {},
                payload: request.payload,
                redirects: settings.redirects,
                timeout: settings.timeout,
                agent: internals.agent(protocol, settings, request.connection)
            };

            var bind = request.route.settings.bind;

            if (settings.passThrough) {
                options.headers = Hoek.clone(request.headers);
                delete options.headers.host;

                if (settings.acceptEncoding === false) {                    // Defaults to true
                    delete options.headers['accept-encoding'];
                }

                if (options.headers.cookie) {
                    delete options.headers.cookie;

                    var cookieHeader = request.connection.states.passThrough(request.headers.cookie, settings.localStatePassThrough);
                    if (cookieHeader) {
                        if (typeof cookieHeader !== 'string') {
                            return reply(cookieHeader);                     // Error
                        }

                        options.headers.cookie = cookieHeader;
                    }
                }
            }

            if (headers) {
                Hoek.merge(options.headers, headers);
            }

            if (settings.xforward &&
                request.info.remoteAddress &&
                request.info.remotePort) {

                options.headers['x-forwarded-for'] = (options.headers['x-forwarded-for'] ? options.headers['x-forwarded-for'] + ',' : '') + request.info.remoteAddress;
                options.headers['x-forwarded-port'] = (options.headers['x-forwarded-port'] ? options.headers['x-forwarded-port'] + ',' : '') + request.info.remotePort;
                options.headers['x-forwarded-proto'] = (options.headers['x-forwarded-proto'] ? options.headers['x-forwarded-proto'] + ',' : '') + protocol;
            }

            var contentType = request.headers['content-type'];
            if (contentType) {
                options.headers['content-type'] = contentType;
            }

            // Send request

            Wreck.request(request.method, uri, options, function (err, res) {

                var ttl = null;

                if (err) {
                    if (settings.onResponse) {
                        return settings.onResponse.call(bind, err, res, request, reply, settings, ttl);
                    }

                    return reply(err);
                }

                if (settings._upstreamTtl) {
                    var cacheControlHeader = res.headers['cache-control'];
                    if (cacheControlHeader) {
                        var cacheControl = Wreck.parseCacheControl(cacheControlHeader);
                        if (cacheControl) {
                            ttl = cacheControl['max-age'] * 1000;
                        }
                    }
                }

                if (settings.onResponse) {
                    return settings.onResponse.call(bind, null, res, request, reply, settings, ttl);
                }

                var response = reply(res)
                    .ttl(ttl)
                    .code(res.statusCode)
                    .passThrough(!!settings.passThrough);   // Default to false
            });
        });
    };
};


internals.handler.defaults = function (method) {

    var payload = method !== 'get' && method !== 'head';
    return payload ? {
        payload: {
            output: 'stream',
            parse: false
        }
    } : null;
};


internals.mapUri = function (protocol, host, port, uri) {

    if (uri) {
        return function (request, next) {

            if (uri.indexOf('{') === -1) {
                return next(null, uri);
            }

            var address = uri.replace(/{protocol}/g, request.connection.info.protocol)
                             .replace(/{host}/g, request.connection.info.host)
                             .replace(/{port}/g, request.connection.info.port)
                             .replace(/{path}/g, request.url.path);

            return next(null, address);
        };
    }

    if (protocol &&
        protocol[protocol.length - 1] !== ':') {

        protocol += ':';
    }

    protocol = protocol || 'http:';
    port = port || (protocol === 'http:' ? 80 : 443);
    var baseUrl = protocol + '//' + host + ':' + port;

    return function (request, next) {

        return next(null, baseUrl + request.path + (request.url.search || ''));
    };
};


internals.agent = function (protocol, settings, connection) {

    if (settings.agent) {
        return settings.agent;
    }

    if (settings.maxSockets === false) {
        return undefined;
    }

    internals.agents[connection.info.uri] = internals.agents[connection.info.uri] || {};
    var agents = internals.agents[connection.info.uri];

    var type = (protocol === 'http' ? 'http' : (settings.rejectUnauthorized === false ? 'insecure' : 'https'));
    if (!agents[type]) {
        agents[type] = (type === 'http' ? new Http.Agent() : (type === 'https' ? new Https.Agent() : new Https.Agent({ rejectUnauthorized: false })));
        agents[type].maxSockets = settings.maxSockets;
    }

    return agents[type];
};
