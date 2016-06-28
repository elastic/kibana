// Load modules

var Events = require('events');
var Catbox = require('catbox');
var CatboxMemory = require('catbox-memory');
var H2o2 = require('h2o2');
var Heavy = require('heavy');
var Hoek = require('hoek');
var Inert = require('inert');
var Items = require('items');
var Mimos = require('mimos');
var Vision = require('vision');
var Connection = require('./connection');
var Defaults = require('./defaults');
var Methods = require('./methods');
var Plugin = require('./plugin');
var Reply = require('./reply');
var Request = require('./request');
var Schema = require('./schema');


// Declare internals

var internals = {};


exports = module.exports = internals.Server = function (options) {

    Hoek.assert(this instanceof internals.Server, 'Server must be instantiated using new');

    options = Schema.assert('server', options || {});

    this._settings = Hoek.applyToDefaultsWithShallow(Defaults.server, options, ['connections.routes.bind']);
    this._settings.connections = Hoek.applyToDefaultsWithShallow(Defaults.connection, this._settings.connections || {}, ['routes.bind']);
    this._settings.connections.routes.cors = Hoek.applyToDefaults(Defaults.cors, this._settings.connections.routes.cors);
    this._settings.connections.routes.security = Hoek.applyToDefaults(Defaults.security, this._settings.connections.routes.security);

    this._caches = {};                                                  // Cache clients
    this._handlers = {};                                                // Registered handlers
    this._methods = new Methods(this);                                  // Server methods

    this._events = new Events.EventEmitter();                           // Server-only events
    this._dependencies = [];                                            // Plugin dependencies
    this._afters = null;                                                // Plugin after() dependencies
    this._heavy = new Heavy(this._settings.load);
    this._mime = new Mimos(this._settings.mime);
    this._replier = new Reply();
    this._requestor = new Request();
    this._decorations = {};
    this._plugins = {};                                                 // Exposed plugin properties by name
    this._app = {};

    if (options.cache) {
        var caches = [].concat(options.cache);
        for (var i = 0, il = caches.length; i < il; ++i) {
            this._createCache(caches[i]);
        }
    }

    if (!this._caches._default) {
        this._createCache({ engine: CatboxMemory });                    // Defaults to memory-based
    }

    Plugin.call(this, this, [], '');

    if (!this._settings.minimal) {
        this.register([Vision, Inert, H2o2], Hoek.ignore);              // Safe to ignore
    }
};

Hoek.inherits(internals.Server, Plugin);


internals.Server.prototype._createCache = function (options) {

    if (typeof options === 'function') {
        options = { engine: options };
    }

    var name = options.name || '_default';
    Hoek.assert(!this._caches[name], 'Cannot configure the same cache more than once: ', name === '_default' ? 'default cache' : name);

    var client = null;
    if (typeof options.engine === 'object') {
        client = new Catbox.Client(options.engine);
    }
    else {
        var settings = Hoek.clone(options);
        settings.partition = settings.partition || 'hapi-cache';
        delete settings.name;
        delete settings.engine;
        delete settings.shared;

        client = new Catbox.Client(options.engine, settings);
    }

    this._caches[name] = {
        client: client,
        segments: {},
        shared: options.shared || false
    };
};


internals.Server.prototype.connection = function (options) {

    var settings = Hoek.applyToDefaultsWithShallow(this._settings.connections, options || {}, ['listener', 'routes.bind']);
    settings.routes.cors = Hoek.applyToDefaults(this._settings.connections.routes.cors || Defaults.cors, settings.routes.cors);
    settings.routes.security = Hoek.applyToDefaults(this._settings.connections.routes.security || Defaults.security, settings.routes.security);

    settings = Schema.assert('connection', settings);       // Applies validation changes (type cast)

    var connection = new Connection(this, settings);
    this.connections.push(connection);
    this.addEmitter(connection);

    if (this.connections.length === 1) {
        this._single();
    }

    return this._clone([connection]);
};


internals.Server.prototype.start = function (callback) {

    var self = this;

    callback = callback || Hoek.ignore;

    Hoek.assert(this.connections.length, 'No connections to start');

    // Assert dependencies

    for (var i = 0, il = this._dependencies.length; i < il; ++i) {
        var dependency = this._dependencies[i];
        for (var s = 0, sl = dependency.connections.length; s < sl; ++s) {
            var connection = dependency.connections[s];
            for (var d = 0, dl = dependency.deps.length; d < dl; ++d) {
                var dep = dependency.deps[d];
                Hoek.assert(connection._registrations[dep], 'Plugin', dependency.plugin, 'missing dependency', dep, 'in connection:', connection.info.uri);
            }
        }
    }

    // Start cache

    var caches = Object.keys(self._caches);
    Items.parallel(caches, function (cache, next) {

        self._caches[cache].client.start(next);
    },
    function (err) {

        if (err) {
            return callback(err);
        }

        // After hooks

        var finalize = function (err) {

            if (err) {
                return callback(err);
            }

            // Load measurements

            self._heavy.start();

            // Start connections

            Items.serial(self.connections, function (connectionItem, next) {

                connectionItem._start(next);
            },
            function (err) {

                self._events.emit('start');
                return callback(err);
            });
        };

        var exts = self._afters;
        if (!exts) {
            return process.nextTick(finalize);
        }

        Items.serial(exts.nodes, function (ext, next) {

            ext.func(ext.plugin, next);
        },
        function (err) {

            return finalize(err);
        });
    });
};


internals.Server.prototype.stop = function (/*[options], [callback]*/) {

    var self = this;

    var callback = (arguments.length === 1 ? (typeof arguments[0] === 'function' ? arguments[0] : null) : arguments[1]);
    var options = (arguments.length === 1 ? (typeof arguments[0] === 'function' ? null : arguments[0]) : arguments[0]);

    Items.serial(this.connections, function (connection, next) {

        connection._stop(options, next);
    },
    function (err) {

        var caches = Object.keys(self._caches);
        for (var i = 0, il = caches.length; i < il; ++i) {
            self._caches[caches[i]].client.stop();
        }

        self._events.emit('stop');
        self._heavy.stop();

        if (callback) {
            callback(err);
        }
    });
};
