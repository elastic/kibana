// Load modules

var Hoek = require('hoek');
var Items = require('items');
var Methods = require('./methods');
var Response = require('./response');


// Declare internals

var internals = {};


exports.execute = function (request, next) {

    var finalize = function (err, result) {

        request._setResponse(err || result);
        return next();                              // Must not include an argument
    };

    request._protect.run('handler', finalize, function (exit) {

        if (request._route._prerequisites) {
            internals.prerequisites(request, Hoek.once(exit));
        }
        else {
            internals.handler(request, exit);
        }
    });
};


internals.prerequisites = function (request, callback) {

    Items.serial(request._route._prerequisites, function (set, nextSet) {

        Items.parallel(set, function (pre, next) {

            pre(request, function (err, result) {

                if (err) {
                    return next(err);
                }

                if (!result._takeover) {
                    return next();
                }

                return callback(null, result);
            });
        }, nextSet);
    },
    function (err) {

        if (err) {
            return callback(err);
        }

        return internals.handler(request, callback);
    });
};


internals.handler = function (request, callback) {

    var timer = new Hoek.Bench();
    var finalize = function (response, data) {

        if (response === null) {                            // reply.continue()
            response = Response.wrap(null, request);
            return response._prepare(null, finalize);
        }

        // Check for Error result

        if (response.isBoom) {
            request._log(['handler', 'error'], { msec: timer.elapsed(), error: response.message, data: response });
            return callback(response);
        }

        request._log(['handler'], { msec: timer.elapsed() });
        return callback(null, response);
    };

    // Decorate request

    var reply = request.server._replier.interface(request, request.route.realm, finalize);
    var bind = request.route.settings.bind;

    // Execute handler

    request.route.settings.handler.call(bind, request, reply);
};


exports.defaults = function (method, handler, server) {

    var defaults = null;

    if (typeof handler === 'object') {
        var type = Object.keys(handler)[0];
        var serverHandler = server._handlers[type];

        Hoek.assert(serverHandler, 'Unknown handler:', type);

        if (serverHandler.defaults) {
            defaults = (typeof serverHandler.defaults === 'function' ? serverHandler.defaults(method) : serverHandler.defaults);
        }
    }

    return defaults || {};
};


exports.configure = function (handler, route) {

    if (typeof handler === 'object') {
        var type = Object.keys(handler)[0];
        var serverHandler = route.server._handlers[type];

        Hoek.assert(serverHandler, 'Unknown handler:', type);

        return serverHandler(route.public, handler[type]);
    }

    if (typeof handler === 'string') {
        var parsed = internals.fromString('handler', handler, route.server);
        return parsed.method;
    }

    return handler;
};


exports.prerequisites = function (config, server) {

    if (!config) {
        return null;
    }

    /*
        [
            [
                function (request, reply) { },
                {
                    method: function (request, reply) { }
                    assign: key1
                },
                {
                    method: function (request, reply) { },
                    assign: key2
                }
            ],
            'user(params.id)'
        ]
    */

    var prerequisites = [];

    for (var i = 0, il = config.length; i < il; ++i) {
        var pres = [].concat(config[i]);

        var set = [];
        for (var p = 0, pl = pres.length; p < pl; ++p) {
            var pre = pres[p];
            if (typeof pre !== 'object') {
                pre = { method: pre };
            }

            var item = {
                method: pre.method,
                assign: pre.assign,
                failAction: pre.failAction || 'error'
            };

            if (typeof item.method === 'string') {
                var parsed = internals.fromString('pre', item.method, server);
                item.method = parsed.method;
                item.assign = item.assign || parsed.name;
            }

            set.push(internals.pre(item));
        }

        prerequisites.push(set);
    }

    return prerequisites.length ? prerequisites : null;
};


internals.fromString = function (type, notation, server) {

    //                                  1:name            2:(        3:arguments
    var methodParts = notation.match(/^([\w\.]+)(?:\s*)(?:(\()(?:\s*)(\w+(?:\.\w+)*(?:\s*\,\s*\w+(?:\.\w+)*)*)?(?:\s*)\))?$/);
    Hoek.assert(methodParts, 'Invalid server method string notation:', notation);

    var name = methodParts[1];
    Hoek.assert(name.match(Methods.methodNameRx), 'Invalid server method name:', name);

    var method = server._methods._normalized[name];
    Hoek.assert(method, 'Unknown server method in string notation:', notation);

    var result = { name: name };
    var argsNotation = !!methodParts[2];
    var methodArgs = (argsNotation ? (methodParts[3] || '').split(/\s*\,\s*/) : null);

    result.method = function (request, reply) {

        if (!argsNotation) {
            return method(request, reply);                      // Method is already bound to context
        }

        var finalize = function (err, value, cached, report) {

            if (report) {
                request._log([type, 'method', name], report);
            }

            return reply(err, value);
        };

        var args = [];
        for (var i = 0, il = methodArgs.length; i < il; ++i) {
            var arg = methodArgs[i];
            if (arg) {
                args.push(Hoek.reach(request, arg));
            }
        }

        args.push(finalize);
        method.apply(null, args);
    };

    return result;
};


internals.pre = function (pre) {

    /*
        {
            method: function (request, next) { }
            assign:     'key'
            failAction: 'error'* | 'log' | 'ignore'
        }
    */

    return function (request, next) {

        var timer = new Hoek.Bench();
        var finalize = function (response, data) {

            if (response === null) {                            // reply.continue()
                response = Response.wrap(null, request);
                return response._prepare(null, finalize);
            }

            if (response instanceof Error) {
                if (pre.failAction !== 'ignore') {
                    request._log(['pre', 'error'], { msec: timer.elapsed(), assign: pre.assign, error: response });
                }

                if (pre.failAction === 'error') {
                    return next(response);
                }
            }
            else {
                request._log(['pre'], { msec: timer.elapsed(), assign: pre.assign });
            }

            if (pre.assign) {
                request.pre[pre.assign] = response.source;
                request.preResponses[pre.assign] = response;
            }

            return next(null, response);
        };

        // Setup environment

        var reply = request.server._replier.interface(request, request.route.realm, finalize);
        var bind = request.route.settings.bind;

        // Execute handler

        pre.method.call(bind, request, reply);
    };
};


exports.invoke = function (request, event, callback) {

    var exts = request.connection._extensions[event];
    if (!exts) {
        return Hoek.nextTick(callback)();
    }

    if (event === 'onPreResponse') {
        request._protect.reset();
    }

    request._protect.run('ext:' + event, callback, function (exit) {

        Items.serial(exts.nodes, function (ext, next) {

            var reply = request.server._replier.interface(request, ext.realm, next);
            var bind = (ext.bind || ext.realm.settings.bind);

            ext.func.call(bind, request, reply);
        }, exit);
    });
};
