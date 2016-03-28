// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var Schema = require('./schema');


// Declare internals

var internals = {};


exports = module.exports = internals.Methods = function (server) {

    this.server = server;
    this.methods = {};
    this._normalized = {};
};


internals.Methods.prototype.add = function (name, method, options, realm) {

    if (typeof name !== 'object') {
        return this._add(name, method, options, realm);
    }

    // {} or [{}, {}]

    var items = [].concat(name);
    for (var i = 0, il = items.length; i < il; ++i) {
        var item = items[i];
        this._add(item.name, item.method, item.options, realm);
    }
};


exports.methodNameRx = /^[_$a-zA-Z][$\w]*(?:\.[_$a-zA-Z][$\w]*)*$/;


internals.Methods.prototype._add = function (name, method, options, realm) {

    Hoek.assert(typeof method === 'function', 'method must be a function');
    Hoek.assert(typeof name === 'string', 'name must be a string');
    Hoek.assert(name.match(exports.methodNameRx), 'Invalid name:', name);
    Hoek.assert(!Hoek.reach(this.methods, name, { functions: false }), 'Server method function name already exists');

    options = options || {};
    Schema.assert('method', options, name);

    var settings = Hoek.cloneWithShallow(options, ['bind']);
    settings.generateKey = settings.generateKey || internals.generateKey;
    var bind = settings.bind || realm.settings.bind || null;

    var apply = function () {

        return method.apply(bind, arguments);
    };

    var bound = bind ? apply : method;

    // Normalize methods

    var normalized = bound;
    if (settings.callback === false) {                                          // Defaults to true
        normalized = function (/* arg1, arg2, ..., argn, methodNext */) {

            var args = [];
            for (var i = 0, il = arguments.length; i < il - 1; ++i) {
                args.push(arguments[i]);
            }

            var methodNext = arguments[il - 1];

            var result = null;
            var error = null;

            try {
                result = method.apply(bind, args);
            }
            catch (err) {
                error = err;
            }

            if (result instanceof Error) {
                error = result;
                result = null;
            }

            if (error ||
                typeof result !== 'object' ||
                typeof result.then !== 'function') {

                return methodNext(error, result);
            }

            // Promise object

            var onFulfilled = function (outcome) {

                return methodNext(null, outcome);
            };

            var onRejected = function (err) {

                return methodNext(err);
            };

            result.then(onFulfilled, onRejected);
        };
    }

    // Not cached

    if (!settings.cache) {
        return this._assign(name, bound, normalized);
    }

    // Cached

    Hoek.assert(!settings.cache.generateFunc, 'Cannot set generateFunc with method caching');

    settings.cache.generateFunc = function (id, next) {

        id.args.push(next);                     // function (err, result, ttl)
        normalized.apply(bind, id.args);
    };

    var cache = this.server.cache(settings.cache, '#' + name);

    var func = function (/* arguments, methodNext */) {

        var args = [];
        for (var i = 0, il = arguments.length; i < il - 1; ++i) {
            args.push(arguments[i]);
        }

        var methodNext = arguments[il - 1];

        var key = settings.generateKey.apply(bind, args);
        if (key === null ||                                 // Value can be ''
            typeof key !== 'string') {                      // When using custom generateKey

            return Hoek.nextTick(methodNext)(Boom.badImplementation('Invalid method key when invoking: ' + name, { name: name, args: args }));
        }

        cache.get({ id: key, args: args }, methodNext);
    };

    func.cache = {
        drop: function (/* arguments, callback */) {

            var args = [];
            for (var i = 0, il = arguments.length; i < il - 1; ++i) {
                args.push(arguments[i]);
            }

            var methodNext = arguments[il - 1];

            var key = settings.generateKey.apply(null, args);
            if (key === null) {                             // Value can be ''
                return Hoek.nextTick(methodNext)(Boom.badImplementation('Invalid method key'));
            }

            return cache.drop(key, methodNext);
        }
    };

    this._assign(name, func, func);
};


internals.Methods.prototype._assign = function (name, method, normalized) {

    var path = name.split('.');
    var ref = this.methods;
    for (var i = 0, il = path.length; i < il; ++i) {
        if (!ref[path[i]]) {
            ref[path[i]] = (i + 1 === il ? method : {});
        }

        ref = ref[path[i]];
    }

    this._normalized[name] = normalized;
};


internals.generateKey = function () {

    var key = '';
    for (var i = 0, il = arguments.length; i < il; ++i) {
        var arg = arguments[i];
        if (typeof arg !== 'string' &&
            typeof arg !== 'number' &&
            typeof arg !== 'boolean') {

            return null;
        }

        key += (i ? ':' : '') + encodeURIComponent(arg.toString());
    }

    return key;
};
