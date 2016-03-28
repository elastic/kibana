// Load modules

var Fs = require('fs');
var Path = require('path');
var Boom = require('boom');
var Hoek = require('hoek');
var Joi = require('joi');
var Items = require('items');
var Manager = require('./manager');
// Additional helper modules required in constructor


// Declare internals

var internals = {};


internals.schema = Joi.alternatives([
    Joi.string(),
    Joi.object({
        template: Joi.string(),
        context: Joi.object(),
        options: Joi.object()
    })
]);


exports.register = function (server, options, next) {

    server.decorate('server', 'views', function (options) {

        Hoek.assert(options, 'Missing views options');
        this.realm.plugins.vision = this.realm.plugins.vision || {};
        Hoek.assert(!this.realm.plugins.vision.manager, 'Cannot set views manager more than once');

        if (!options.relativeTo &&
            this.realm.settings.files.relativeTo) {

            options = Hoek.shallow(options);
            options.relativeTo = this.realm.settings.files.relativeTo;
        }

        this.realm.plugins.vision.manager = new Manager(options);
    });

    server.decorate('server', 'render', function (template, context, options, callback) {

        callback = (typeof callback === 'function' ? callback : options);
        options = (options === callback ? {} : options);

        var vision = (this.realm.plugins.vision || this.root.realm.plugins.vision || {});
        Hoek.assert(vision.manager, 'Missing views manager');
        return vision.manager.render(template, context, options, callback);
    });

    server.handler('view', internals.handler);

    server.decorate('reply', 'view', function (template, context, options) {

        var realm = (this.realm.plugins.vision || this.request.server.realm.plugins.vision || {});
        Hoek.assert(realm.manager, 'Cannot render view without a views manager configured');
        return this.response(realm.manager._response(template, context, options, this.request));
    });

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};


internals.handler = function (route, options) {

    Joi.assert(options, internals.schema, 'Invalid view handler options (' + route.path + ')');

    if (typeof options === 'string') {
        options = { template: options };
    }

    var settings = {                                                // Shallow copy to allow making dynamic changes to context
        template: options.template,
        context: options.context,
        options: options.options
    };

    return function (request, reply) {

        var context = {
            params: request.params,
            payload: request.payload,
            query: request.query,
            pre: request.pre
        };

        if (settings.context) {                                     // Shallow copy to avoid cloning unknown objects
            var keys = Object.keys(settings.context);
            for (var i = 0, il = keys.length; i < il; ++i) {
                var key = keys[i];
                context[key] = settings.context[key];
            }
        }

        reply.view(settings.template, context, settings.options);
    };
};
