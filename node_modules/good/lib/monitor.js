// Load modules

var Events = require('events');
var Http = require('http');
var Https = require('https');
var Os = require('os');
var Stream = require('stream');

var Hoek = require('hoek');
var Items = require('items');
var Wreck = require('wreck');

var Network = require('./network');
var Package = require('../package.json');
var ProcessMonitor = require('./process');
var Schema = require('./schema');
var System = require('./system');
var Utils = require('./utils');


// Declare internals

var internals = {
    host: Os.hostname(),
    appVer: Package.version
};


internals.defaults = {
    opsInterval: 15000,
    responseEvent: 'tail',
    requestHeaders: false,
    requestPayload: false,
    responsePayload: false,
    extensions: [],
    reporters: [],
    filter: {}
};


module.exports = internals.Monitor = function (server, options) {

    options = options || {};

    Hoek.assert(this.constructor === internals.Monitor, 'Monitor must be instantiated using new');
    Hoek.assert(server, 'server required to create monitor');

    options = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['reporters', 'httpAgents', 'httpsAgents']);

    // Force them to be arrays
    options.httpAgents = [].concat(options.httpAgents || Http.globalAgent);
    options.httpsAgents = [].concat(options.httpsAgents || Https.globalAgent);


    this.settings = options;
    this._state = {
        handlers: {},
        extensions: {}
    };
    this._server = server;
    this._dataStream = new Stream.Readable({ objectMode: true });
    this._dataStream._read = Hoek.ignore;

    // Options used to create Great Response
    this._responseOptions = {
        requestHeaders: this.settings.requestHeaders,
        requestPayload: this.settings.requestPayload,
        responsePayload: this.settings.responsePayload
    };

    // Validate settings
    Schema.assert('monitorOptions', this.settings);

    // Register as event emitter
    Events.EventEmitter.call(this);
};

Hoek.inherits(internals.Monitor, Events.EventEmitter);


internals.Monitor.prototype.start = function (callback) {

    var self = this;

    var setupOpsMonitoring = function () {

        var pmonitor = ProcessMonitor;
        var os = System;
        var network = new Network.Monitor(self._server);

        var asyncOps = {
            osload: os.loadavg,
            osmem: os.mem,
            osup: os.uptime,
            psup: pmonitor.uptime,
            psmem: pmonitor.memoryUsage,
            psdelay: pmonitor.delay,
            requests: network.requests.bind(network),
            concurrents: network.concurrents.bind(network),
            responseTimes: network.responseTimes.bind(network),
            sockets: network.sockets.bind(network, self.settings.httpAgents, self.settings.httpsAgents)
        };

        // Set ops interval timer

        return function () {

            // Gather operational statistics in parallel

            Items.parallel.execute(asyncOps, function (error, results) {

                if (error) {
                    console.error(error);
                }
                else {
                    results.host = internals.host;
                    self.emit('ops', results);
                }
                network.reset();
            });
        };
    };

    Items.serial(this.settings.reporters, function (item, next) {

        var reporter;

        // If it has a reporter constructor, then create a new one, otherwise, assume it is
        // a valid pre-constructed reporter
        if (item.reporter) {

            // If the supply a path or module node, try to load it
            if (typeof item.reporter === 'string') {
                item.reporter = require(item.reporter);
            }

            Hoek.assert(typeof item.reporter === 'function', 'reporter key must be a constructor function');
            Hoek.assert(typeof item.events === 'object', 'reporter must specify events to filter on');

            var Reporter = item.reporter;

            reporter = new Reporter(item.events, item.config);
        }
        else {
            reporter = item;
        }

        Hoek.assert(reporter.init, 'Every reporter object must have an init method');
        reporter.init(self._dataStream, self, next);
    }, function (error) {

        if (error) {
            return callback(error);
        }

        self._state.opsInterval = setInterval(setupOpsMonitoring(), self.settings.opsInterval);
        self._state.opsHandler = self._opsHandler.bind(self);
        self._state.wreckHandler = self._wreckHandler.bind(self);

        self._state.handlers.log = self._logHandler.bind(self);
        self._state.handlers['request-error'] = self._errorHandler.bind(self);
        self._state.handlers[self.settings.responseEvent] = self._responseHandler.bind(self);
        self._state.handlers.request = self._requestLogHandler.bind(self);

        // Initialize Events
        internals.iterateOverEventHash(self._state.handlers, function (event, handler) {

            self._server.on(event, handler);
        });

        self.on('ops', self._state.opsHandler);
        Wreck.on('response', self._state.wreckHandler);

        // Events can not be any of ['log', 'request-error', 'ops', 'request', 'response', 'tail']
        for (var i = 0, il = self.settings.extensions.length; i < il; ++i) {
            var event = self.settings.extensions[i];

            self._state.extensions[event] = self._extensionHandler.bind(self, event);
            self._server.on(self.settings.extensions[i], self._state.extensions[event]);
        }

        return callback();
    });
};


internals.Monitor.prototype.stop = function () {

    var self = this;
    var state = this._state;
    clearInterval(state.opsInterval);

    this.removeListener('ops', state.opsHandler);
    Wreck.removeListener('response', state.wreckHandler);

    internals.iterateOverEventHash(state.handlers, function (event, handler) {

        self._server.removeListener(event, handler);
    });

    internals.iterateOverEventHash(state.extensions, function (event, handler) {

        self._server.removeListener(event, handler);
    });

    this.emit('stop');
};


internals.Monitor.prototype._requestLogHandler = function (request, event) {

    this._dataStream.push(Utils.GreatRequest(request, event));
};


internals.Monitor.prototype._logHandler = function (event) {

    this._dataStream.push(Utils.GreatLog(event));
};


internals.Monitor.prototype._errorHandler = function (request, error) {

    this._dataStream.push(Utils.GreatError(request, error));
};


internals.Monitor.prototype._responseHandler = function (request) {

    this._dataStream.push(Utils.GreatResponse(request, this._responseOptions, this.settings.filter));
};


internals.Monitor.prototype._opsHandler = function (results) {

    this._dataStream.push(Utils.GreatOps(results));
};


internals.Monitor.prototype._wreckHandler = function (error, request, response, start, uri) {

    this._dataStream.push(Utils.GreatWreck(error, request, response, start, uri));
};


internals.Monitor.prototype._extensionHandler = function (eventName) {

    var event;
    // (eventName, request, event, tags)
    if (arguments.length === 4) {
        event = arguments[2] || {};
    }
    else {
        event = arguments[1] || {};
    }
    event.event = eventName;
    this._dataStream.push(Object.freeze(event));
};

internals.iterateOverEventHash = function (hash, predicate) {

    var keys = Object.keys(hash);
    for (var k = 0, kl = keys.length; k < kl; ++k) {
        var key = keys[k];
        predicate(key, hash[key]);
    }
};
