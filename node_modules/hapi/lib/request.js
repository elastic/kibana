// Load modules

var Events = require('events');
var Url = require('url');
var Accept = require('accept');
var Boom = require('boom');
var Hoek = require('hoek');
var Items = require('items');
var Peekaboo = require('peekaboo');
var Qs = require('qs');
var Handler = require('./handler');
var Protect = require('./protect');
var Response = require('./response');
var Transmit = require('./transmit');


// Declare internals

var internals = {
    properties: ['connection', 'server', 'url', 'query', 'path', 'method', 'mime', 'setUrl', 'setMethod', 'headers', 'id', 'app', 'plugins', 'route', 'auth', 'session', 'pre', 'preResponses', 'info', 'orig', 'params', 'paramsArray', 'payload', 'state', 'jsonp', 'response', 'raw', 'tail', 'addTail', 'domain', 'log', 'getLog', 'generateResponse']
};


exports = module.exports = internals.Generator = function () {

    this._decorations = null;
};


internals.Generator.prototype.request = function (connection, req, res, options) {

    var request = new internals.Request(connection, req, res, options);

    // Decorate

    if (this._decorations) {
        var methods = Object.keys(this._decorations);
        for (var i = 0, il = methods.length; i < il; ++i) {
            var method = methods[i];
            request[method] = this._decorations[method];
        }
    }

    return request;
};


internals.Generator.prototype.decorate = function (property, method) {

    Hoek.assert(!this._decorations || !this._decorations[property], 'Request interface decoration already defined:', property);
    Hoek.assert(internals.properties.indexOf(property) === -1, 'Cannot override built-in request interface decoration:', property);

    this._decorations = this._decorations || {};
    this._decorations[property] = method;
};


internals.Request = function (connection, req, res, options) {

    var self = this;

    Events.EventEmitter.call(this);

    // Take measurement as soon as possible

    this._bench = new Hoek.Bench();
    var now = Date.now();

    // Public members

    this.connection = connection;
    this.server = connection.server;

    this.url = null;
    this.query = null;
    this.path = null;
    this.method = null;
    this.mime = null;                       // Set if payload is parsed

    this.setUrl = this._setUrl;             // Decoration removed after 'onRequest'
    this.setMethod = this._setMethod;

    this._setUrl(req.url, this.connection.settings.router.stripTrailingSlash);      // Sets: this.url, this.path, this.query
    this._setMethod(req.method);                                                    // Sets: this.method
    this.headers = req.headers;

    this.id = now + ':' + connection.info.id + ':' + connection._requestCounter.value++;
    if (connection._requestCounter.value > connection._requestCounter.max) {
        connection._requestCounter.value = connection._requestCounter.min;
    }

    this.app = {};                          // Place for application-specific state without conflicts with hapi, should not be used by plugins
    this.plugins = {};                      // Place for plugins to store state without conflicts with hapi, should be namespaced using plugin name

    this._route = this.connection._router.specials.notFound.route;    // Used prior to routing (only settings are used, not the handler)
    this.route = this._route.public;

    this.auth = {
        isAuthenticated: false,
        credentials: null,                  // Special keys: 'app', 'user', 'scope'
        artifacts: null,                    // Scheme-specific artifacts
        session: null                       // Used by cookie auth { set(), clear() }
    };

    this.session = null;                    // Special key reserved for plugins implementing session support

    this.pre = {};                          // Pre raw values
    this.preResponses = {};                 // Pre response values

    this.info = {
        received: now,
        responded: 0,
        remoteAddress: req.connection ? req.connection.remoteAddress : '',
        remotePort: req.connection ? req.connection.remotePort : '',
        referrer: req.headers.referrer || req.headers.referer || '',
        host: req.headers.host ? req.headers.host.replace(/\s/g, '') : '',
        acceptEncoding: Accept.encoding(this.headers['accept-encoding'], ['identity', 'gzip', 'deflate'])
    };

    this.info.hostname = this.info.host.split(':')[0];

    // Apply options

    if (options.credentials) {
        this.auth.credentials = options.credentials;
    }

    if (options.artifacts) {
        this.auth.artifacts = options.artifacts;
    }

    // Assigned elsewhere:

    this.orig = {};
    this.params = {};
    this.paramsArray = [];              // Array of path parameters in path order
    this.payload = null;
    this.state = null;
    this.jsonp = null;
    this.response = null;

    // Semi-public members

    this.raw = {
        req: req,
        res: res
    };

    this.tail = this.addTail = this._addTail;       // Removed once wagging

    // Private members

    this._states = {};
    this._logger = [];
    this._isPayloadPending = true;      // false when incoming payload fully processed
    this._isBailed = false;             // true when lifecycle should end
    this._isReplied = false;            // true when response processing started
    this._isFinalized = false;          // true when request completed (may be waiting on tails to complete)
    this._tails = {};                   // tail id -> name (tracks pending tails)
    this._tailIds = 0;                  // Used to generate a unique tail id
    this._protect = new Protect(this);
    this.domain = this._protect.domain;

    // Listen to request state

    this._onEnd = function () {

        self._isPayloadPending = false;
    };

    this.raw.req.once('end', this._onEnd);

    this._onClose = function () {

        self._log(['request', 'closed', 'error']);
        self._isPayloadPending = false;
        self._isBailed = true;
    };

    this.raw.req.once('close', this._onClose);

    this._onError = function (err) {

        self._log(['request', 'error'], err);
        self._isPayloadPending = false;
    };

    this.raw.req.once('error', this._onError);

    // Log request

    var about = {
        id: this.id,
        method: this.method,
        url: this.url.href,
        agent: this.raw.req.headers['user-agent']
    };

    this._log(['received'], about, now);     // Must be last for object to be fully constructed
};

Hoek.inherits(internals.Request, Events.EventEmitter);


internals.Request.prototype._setUrl = function (url, stripTrailingSlash, parserOptions) {

    this.url = Url.parse(url, false);
    this.url.query = Qs.parse(this.url.query, this.connection.settings.query.qs || parserOptions);      // Override parsed value
    this.query = this.url.query;
    this.path = this.url.pathname || '';                                                            // pathname excludes query

    if (stripTrailingSlash &&
        this.path.length > 1 &&
        this.path[this.path.length - 1] === '/') {

        this.path = this.path.slice(0, -1);
        this.url.pathname = this.path;
    }

    this.path = this.connection._router.normalize(this.path);
};


internals.Request.prototype._setMethod = function (method) {

    Hoek.assert(method && typeof method === 'string', 'Missing method');
    this.method = method.toLowerCase();
};


internals.Request.prototype.log = function (tags, data, timestamp, _internal) {

    tags = (Array.isArray(tags) ? tags : [tags]);
    var now = (timestamp ? (timestamp instanceof Date ? timestamp.getTime() : timestamp) : Date.now());

    var event = {
        request: this.id,
        timestamp: now,
        tags: tags,
        data: data,
        internal: !!_internal
    };

    var tagsMap = Hoek.mapToObject(event.tags);

    // Add to request array

    this._logger.push(event);
    this.connection.emit(_internal ? 'request-internal' : 'request', this, event, tagsMap);

    if (this.server._settings.debug &&
        this.server._settings.debug.request &&
        Hoek.intersect(tagsMap, this.server._settings.debug.request, true)) {

        console.error('Debug:', event.tags.join(', '), (data ? '\n    ' + (data.stack || (typeof data === 'object' ? Hoek.stringify(data) : data)) : ''));
    }
};


internals.Request.prototype._log = function (tags, data) {

    return this.log(tags, data, null, true);
};


internals.Request.prototype.getLog = function (tags, internal) {

    if (typeof tags === 'boolean') {
        internal = tags;
        tags = [];
    }

    tags = [].concat(tags || []);
    if (!tags.length &&
        internal === undefined) {

        return this._logger;
    }

    var filter = tags.length ? Hoek.mapToObject(tags) : null;
    var result = [];

    for (var i = 0, il = this._logger.length; i < il; ++i) {
        var event = this._logger[i];
        if (internal === undefined || event.internal === internal) {
            if (filter) {
                for (var t = 0, tl = event.tags.length; t < tl; ++t) {
                    var tag = event.tags[t];
                    if (filter[tag]) {
                        result.push(event);
                        break;
                    }
                }
            }
            else {
                result.push(event);
            }
        }
    }

    return result;
};


internals.Request.prototype._execute = function () {

    var self = this;

    // Execute onRequest extensions (can change request method and url)

    Handler.invoke(this, 'onRequest', function (err) {

        // Undecorate request

        self.setUrl = undefined;
        self.setMethod = undefined;

        if (err) {
            return self._reply(err);
        }

        if (!self.path || self.path[0] !== '/') {
            return self._reply(Boom.badRequest('Invalid path'));
        }

        // Lookup route

        var match = self.connection._router.route(self.method, self.path, self.info.hostname);
        self._route = match.route;
        self.route = self._route.public;
        self.params = match.params;
        self.paramsArray = match.paramsArray;

        // Setup timeout

        if (self.raw.req.socket &&
            self.route.settings.timeout.socket !== undefined) {

            self.raw.req.socket.setTimeout(self.route.settings.timeout.socket || 0);     // Value can be false or positive
        }

        var serverTimeout = self.route.settings.timeout.server;
        if (serverTimeout) {
            serverTimeout = Math.floor(serverTimeout - self._bench.elapsed());      // Calculate the timeout from when the request was constructed
            var timeoutReply = function () {

                self._log(['request', 'server', 'timeout', 'error'], { timeout: serverTimeout, elapsed: self._bench.elapsed() });
                self._reply(Boom.serverTimeout());
            };

            if (serverTimeout <= 0) {
                return timeoutReply();
            }

            self._serverTimeoutId = setTimeout(timeoutReply, serverTimeout);
        }

        Items.serial(self._route._cycle, function (func, next) {

            if (self._isReplied ||
                self._isBailed) {

                return next(Boom.internal('Already closed'));                       // Error is not used
            }

            if (typeof func === 'string') {                                         // Extension point
                return Handler.invoke(self, func, next);
            }

            func(self, next);
        },
        function (err) {

            self._reply(err);
        });
    });
};


internals.Request.prototype._reply = function (exit) {

    var self = this;

    if (this._isReplied) {                                  // Prevent any future responses to this request
        return;
    }

    this._isReplied = true;

    clearTimeout(this._serverTimeoutId);

    if (this._isBailed) {
        return this._finalize();
    }

    if (this.response &&                                    // Can be null if response coming from exit
        this.response.closed) {

        if (this.response.end) {
            this.raw.res.end();                             // End the response in case it wasn't already closed
        }

        return this._finalize();
    }

    if (exit) {
        this._setResponse(Response.wrap(exit, this));
    }

    Handler.invoke(this, 'onPreResponse', function (err) {

        if (err) {                                          // err can be valid response or error
            self._setResponse(Response.wrap(err, self));
        }

        Transmit.send(self, function () {

            return self._finalize();
        });
    });
};


internals.Request.prototype._finalize = function () {

    this.info.responded = Date.now();

    if (this.response &&
        this.response.statusCode === 500 &&
        this.response._error) {

        this.connection.emit('request-error', this, this.response._error);
        this._log(this.response._error.isDeveloperError ? ['internal', 'implementation', 'error'] : ['internal', 'error'], this.response._error);
    }

    this.connection.emit('response', this);

    this._isFinalized = true;
    this.addTail = undefined;
    this.tail = undefined;

    if (Object.keys(this._tails).length === 0) {
        this.connection.emit('tail', this);
    }

    // Cleanup

    this.raw.req.removeListener('end', this._onEnd);
    this.raw.req.removeListener('close', this._onClose);
    this.raw.req.removeListener('error', this._onError);

    if (this.response &&
        this.response._close) {

        this.response._close();
    }

    this._protect.logger = this.server;
};


internals.Request.prototype._setResponse = function (response) {

    if (this.response &&
        !this.response.isBoom &&
        this.response !== response &&
        (response.isBoom || this.response.source !== response.source)) {

        this.response._close();
    }

    if (this._isFinalized) {
        if (response._close) {
            response._close();
        }

        return;
    }

    this.response = response;
};


internals.Request.prototype._addTail = function (name) {

    var self = this;

    name = name || 'unknown';
    var tailId = this._tailIds++;
    this._tails[tailId] = name;
    this._log(['tail', 'add'], { name: name, id: tailId });

    var drop = function () {

        if (!self._tails[tailId]) {
            self._log(['tail', 'remove', 'error'], { name: name, id: tailId });             // Already removed
            return;
        }

        delete self._tails[tailId];

        if (Object.keys(self._tails).length === 0 &&
            self._isFinalized) {

            self._log(['tail', 'remove', 'last'], { name: name, id: tailId });
            self.connection.emit('tail', self);
        }
        else {
            self._log(['tail', 'remove'], { name: name, id: tailId });
        }
    };

    return drop;
};


internals.Request.prototype._setState = function (name, value, options) {          // options: see Defaults.state

    var state = {
        name: name,
        value: value
    };

    if (options) {
        Hoek.assert(!options.autoValue, 'Cannot set autoValue directly in a response');
        state.options = Hoek.clone(options);
    }

    this._states[name] = state;
};


internals.Request.prototype._clearState = function (name, options) {

    var state = {
        name: name
    };

    state.options = Hoek.clone(options || {});
    state.options.ttl = 0;

    this._states[name] = state;
};


internals.Request.prototype._tap = function () {

    return (this.listeners('finish').length || this.listeners('peek').length ? new Peekaboo(this) : null);
};


internals.Request.prototype.generateResponse = function (source, options) {

    return new Response(source, this, options);
};
