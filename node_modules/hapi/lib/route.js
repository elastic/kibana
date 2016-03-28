// Load modules

var Boom = require('boom');
var Catbox = require('catbox');
var Hoek = require('hoek');
var Joi = require('joi');
var Subtext = require('subtext');
var Auth = require('./auth');
var Defaults = require('./defaults');
var Handler = require('./handler');
var Validation = require('./validation');
var Schema = require('./schema');


// Declare internals

var internals = {};


exports = module.exports = internals.Route = function (options, connection, realm) {

    // Apply plugin environment (before schema validation)

    if (realm.modifiers.route.vhost ||
        realm.modifiers.route.prefix) {

        options = Hoek.cloneWithShallow(options, ['config']);       // config is left unchanged
        options.path = (realm.modifiers.route.prefix ? realm.modifiers.route.prefix + (options.path !== '/' ? options.path : '') : options.path);
        options.vhost = realm.modifiers.route.vhost || options.vhost;
    }

    // Setup and validate route configuration

    Hoek.assert(options.path, 'Route missing path');
    Hoek.assert(options.handler || (options.config && options.config.handler), 'Missing or undefined handler:', options.method, options.path);
    Hoek.assert(!!options.handler ^ !!(options.config && options.config.handler), 'Handler must only appear once:', options.method, options.path);            // XOR
    Hoek.assert(options.path === '/' || options.path[options.path.length - 1] !== '/' || !connection.settings.router.stripTrailingSlash, 'Path cannot end with a trailing slash when connection configured to strip:', options.method, options.path);
    Hoek.assert(/^[a-zA-Z0-9!#\$%&'\*\+\-\.^_`\|~]+$/.test(options.method), 'Invalid method name:', options.method, options.path);

    Schema.assert('route', options, options.path);

    var handler = options.handler || options.config.handler;
    var method = options.method.toLowerCase();
    Hoek.assert(method !== 'head', 'Method name not allowed:', options.method, options.path);

    // Apply settings in order: {connection} <- {handler} <- {realm} <- {route}

    var handlerDefaults = Handler.defaults(method, handler, connection.server);
    var base = Hoek.applyToDefaultsWithShallow(connection.settings.routes, handlerDefaults, ['bind']);
    base = Hoek.applyToDefaultsWithShallow(base, realm.settings, ['bind']);
    this.settings = Hoek.applyToDefaultsWithShallow(base, options.config || {}, ['bind']);
    this.settings.handler = handler;

    Schema.assert('routeConfig', this.settings, options.path);

    var socketTimeout = (this.settings.timeout.socket === undefined ? 2 * 60 * 1000 : this.settings.timeout.socket);
    Hoek.assert(!this.settings.timeout.server || !socketTimeout || this.settings.timeout.server < socketTimeout, 'Server timeout must be shorter than socket timeout:', options.path);
    Hoek.assert(!this.settings.payload.timeout || !socketTimeout || this.settings.payload.timeout < socketTimeout, 'Payload timeout must be shorter than socket timeout:', options.path);

    this.connection = connection;
    this.server = connection.server;
    this.path = options.path;
    this.method = method;

    this.public = {
        method: this.method,
        path: this.path,
        vhost: this.vhost,
        realm: realm,
        settings: this.settings
    };

    this.settings.vhost = options.vhost;
    this.settings.plugins = this.settings.plugins || {};            // Route-specific plugins settings, namespaced using plugin name
    this.settings.app = this.settings.app || {};                    // Route-specific application settings

    // Path parsing

    this._analysis = this.connection._router.analyze(this.path);
    this.params = this._analysis.params;
    this.fingerprint = this._analysis.fingerprint;

    // Validation

    var validation = this.settings.validate;
    if (this.method === 'get') {

        // Assert on config, not on merged settings

        Hoek.assert(!options.config || !options.config.payload, 'Cannot set payload settings on HEAD or GET request:', options.path);
        Hoek.assert(!options.config || !options.config.validate || !options.config.validate.payload, 'Cannot validate HEAD or GET requests:', options.path);

        validation.payload = null;
    }

    ['headers', 'params', 'query', 'payload'].forEach(function (type) {

        validation[type] = internals.compileRule(validation[type]);
    });

    if (this.settings.response.schema !== undefined ||
        this.settings.response.status) {

        var rule = this.settings.response.schema;
        this.settings.response.status = this.settings.response.status || {};
        var statuses = Object.keys(this.settings.response.status);

        if ((rule === true && !statuses.length) ||
            this.settings.response.sample === 0) {

            this.settings.response = null;
        }
        else {
            this.settings.response.schema = internals.compileRule(rule);
            for (var i = 0, il = statuses.length; i < il; ++i) {
                var code = statuses[i];
                this.settings.response.status[code] = internals.compileRule(this.settings.response.status[code]);
            }
        }
    }
    else {
        this.settings.response = null;
    }

    // Payload parsing

    if (this.method === 'get') {

        this.settings.payload = null;
    }
    else {
        if (this.settings.payload.allow) {
            this.settings.payload.allow = [].concat(this.settings.payload.allow);
        }
    }

    Hoek.assert(!this.settings.validate.payload || this.settings.payload.parse, 'Route payload must be set to \'parse\' when payload validation enabled:', options.method, options.path);
    Hoek.assert(!this.settings.jsonp || typeof this.settings.jsonp === 'string', 'Bad route JSONP parameter name:', options.path);

    // Authentication configuration

    this.settings.auth = this.connection.auth._setupRoute(this.settings.auth, options.path);

    // Cache

    if (this.method === 'get' &&
        (this.settings.cache.expiresIn || this.settings.cache.expiresAt)) {

        this.settings.cache._statuses = Hoek.mapToObject(this.settings.cache.statuses);
        this._cache = new Catbox.Policy({ expiresIn: this.settings.cache.expiresIn, expiresAt: this.settings.cache.expiresAt });
    }

    // CORS

    if (this.settings.cors) {
        this.settings.cors = Hoek.applyToDefaults(Defaults.cors, this.settings.cors);

        var cors = this.settings.cors;
        cors._headers = cors.headers.concat(cors.additionalHeaders).join(', ');
        cors._methods = cors.methods.concat(cors.additionalMethods).join(', ');
        cors._exposedHeaders = cors.exposedHeaders.concat(cors.additionalExposedHeaders).join(', ');

        if (cors.origin.length) {
            cors._origin = {
                any: false,
                qualified: [],
                qualifiedString: '',
                wildcards: []
            };

            if (cors.origin.indexOf('*') !== -1) {
                Hoek.assert(cors.origin.length === 1, 'Cannot specify cors.origin * together with other values');
                cors._origin.any = true;
            }
            else {
                for (var c = 0, cl = cors.origin.length; c < cl; ++c) {
                    var origin = cors.origin[c];
                    if (origin.indexOf('*') !== -1) {
                        cors._origin.wildcards.push(new RegExp('^' + Hoek.escapeRegex(origin).replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$'));
                    }
                    else {
                        cors._origin.qualified.push(origin);
                    }
                }

                Hoek.assert(cors.matchOrigin || !cors._origin.wildcards.length, 'Cannot include wildcard origin values with matchOrigin disabled');
                cors._origin.qualifiedString = cors._origin.qualified.join(' ');
            }
        }
    }

    // Security

    if (this.settings.security) {
        this.settings.security = Hoek.applyToDefaults(Defaults.security, this.settings.security);

        var security = this.settings.security;
        if (security.hsts) {
            if (security.hsts === true) {
                security._hsts = 'max-age=15768000';
            }
            else if (typeof security.hsts === 'number') {
                security._hsts = 'max-age=' + security.hsts;
            }
            else {
                security._hsts = 'max-age=' + (security.hsts.maxAge || 15768000);
                if (security.hsts.includeSubdomains) {
                    security._hsts += '; includeSubdomains';
                }
            }
        }

        if (security.xframe) {
            if (security.xframe === true) {
                security._xframe = 'DENY';
            }
            else if (typeof security.xframe === 'string') {
                security._xframe = security.xframe.toUpperCase();
            }
            else if (security.xframe.rule === 'allow-from') {
                if (!security.xframe.source) {
                    security._xframe = 'SAMEORIGIN';
                }
                else {
                    security._xframe = 'ALLOW-FROM ' + security.xframe.source;
                }
            }
            else {
                security._xframe = security.xframe.rule.toUpperCase();
            }
        }
    }

    // Handler

    this.settings.handler = Handler.configure(this.settings.handler, this);
    this._prerequisites = Handler.prerequisites(this.settings.pre, this.server);

    // Route lifecycle

    this._cycle = this.lifecycle();
};


internals.compileRule = function (rule) {

    // null, undefined, true - anything allowed
    // false - nothing allowed
    // {...} - ... allowed

    return (rule === false ? Joi.object({}).allow(null)
                           : typeof rule === 'function' ? rule
                                                        : !rule || rule === true ? null                     // false tested earlier
                                                                                 : Joi.compile(rule));
};


internals.Route.prototype.lifecycle = function () {

    var cycle = [];

    // 'onRequest'

    if (this.settings.jsonp) {
        cycle.push(internals.parseJSONP);
    }

    if (this.settings.state.parse) {
        cycle.push(internals.state);
    }

    cycle.push('onPreAuth');

    var authenticate = (this.settings.auth !== false);                          // Anything other than 'false' can still require authentication
    if (authenticate) {
        cycle.push(Auth.authenticate);
    }

    if (this.method !== 'get') {

        cycle.push(internals.payload);

        if (authenticate) {
            cycle.push(Auth.payload);
        }
    }

    cycle.push('onPostAuth');

    if (this.settings.validate.headers) {
        cycle.push(Validation.headers);
    }

    if (this.settings.validate.params) {
        cycle.push(Validation.params);
    }

    if (this.settings.jsonp) {
        cycle.push(internals.cleanupJSONP);
    }

    if (this.settings.validate.query) {
        cycle.push(Validation.query);
    }

    if (this.settings.validate.payload) {
        cycle.push(Validation.payload);
    }

    cycle.push('onPreHandler');
    cycle.push(Handler.execute);                                     // Must not call next() with an Error
    cycle.push('onPostHandler');                                     // An error from here on will override any result set in handler()

    if (this.settings.response) {
        cycle.push(Validation.response);
    }

    // 'onPreResponse'

    return cycle;
};


internals.state = function (request, next) {

    request.state = {};

    var req = request.raw.req;
    var cookies = req.headers.cookie;
    if (!cookies) {
        return next();
    }

    request.connection.states.parse(cookies, function (err, state, failed) {

        request.state = state;

        // Clear cookies

        for (var i = 0, il = failed.length; i < il; ++i) {
            var item = failed[i];

            if (item.settings.clearInvalid) {
                request._clearState(item.name);
            }
        }

        // failAction: 'error', 'log', 'ignore'

        if (!err ||
            request.route.settings.state.failAction === 'ignore') {

            return next();
        }

        request._log(['state', 'error'], { header: cookies, errors: err.data });
        return next(request.route.settings.state.failAction === 'error' ? err : null);
    });
};


internals.payload = function (request, next) {

    if (request.method === 'get' ||
        request.method === 'head') {            // When route.method is '*'

        return next();
    }

    var onParsed = function (err, parsed) {

        request.mime = parsed.mime;
        request.payload = parsed.payload || null;

        if (!err) {
            return next();
        }

        var failAction = request.route.settings.payload.failAction;         // failAction: 'error', 'log', 'ignore'
        if (failAction !== 'ignore') {
            request._log(['payload', 'error'], err);
        }

        if (failAction === 'error') {
            return next(err);
        }

        return next();
    };

    Subtext.parse(request.raw.req, request._tap(), request.route.settings.payload, function (err, parsed) {

        if (!err ||
            !request._isPayloadPending) {

            request._isPayloadPending = false;
            return onParsed(err, parsed);
        }

        // Flush out any pending request payload not consumed due to errors

        var stream = request.raw.req;

        var read = function () {

            stream.read();
        };

        var end = function () {

            stream.removeListener('readable', read);
            stream.removeListener('error', end);
            stream.removeListener('end', end);

            request._isPayloadPending = false;
            return onParsed(err, parsed);
        };

        stream.on('readable', read);
        stream.once('error', end);
        stream.once('end', end);
    });
};


internals.parseJSONP = function (request, next) {

    var jsonp = request.query[request.route.settings.jsonp];
    if (jsonp) {
        if (/^[\w\$\[\]\.]+$/.test(jsonp) === false) {
            return next(Boom.badRequest('Invalid JSONP parameter value'));
        }

        request.jsonp = jsonp;
    }

    return next();
};


internals.cleanupJSONP = function (request, next) {

    if (request.jsonp) {
        delete request.query[request.route.settings.jsonp];
    }

    return next();
};
