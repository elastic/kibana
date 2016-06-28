// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var Joi = require('joi');


// Declare internals

var internals = {};


exports.query = function (request, next) {

    return internals.input('query', request, next);
};


exports.payload = function (request, next) {

    if (request.method === 'get' ||
        request.method === 'head') {                // When route.method is '*'

        return next();
    }

    return internals.input('payload', request, next);
};


exports.params = function (request, next) {

    return internals.input('params', request, next);
};


exports.headers = function (request, next) {

    return internals.input('headers', request, next);
};


internals.input = function (source, request, next) {

    if (typeof request[source] !== 'object') {
        return next(Boom.unsupportedMediaType(source + ' must represent an object'));
    }

    var postValidate = function (err, value) {

        request.orig[source] = request[source];
        if (value !== undefined) {
            request[source] = value;
        }

        if (!err) {
            return next();
        }

        if (err.isDeveloperError) {
            return next(err);
        }

        // failAction: 'error', 'log', 'ignore', function (source, err, next)

        if (request.route.settings.validate.failAction === 'ignore') {
            return next();
        }

        // Prepare error

        var error = Boom.badRequest(err.message, err);
        error.output.payload.validation = { source: source, keys: [] };
        if (err.details) {
            for (var i = 0, il = err.details.length; i < il; ++i) {
                error.output.payload.validation.keys.push(Hoek.escapeHtml(err.details[i].path));
            }
        }

        if (request.route.settings.validate.errorFields) {
            var fields = Object.keys(request.route.settings.validate.errorFields);
            for (var f = 0, fl = fields.length; f < fl; ++f) {
                var field = fields[f];
                error.output.payload[field] = request.route.settings.validate.errorFields[field];
            }
        }

        request._log(['validation', 'error', source], error);

        // Log only

        if (request.route.settings.validate.failAction === 'log') {
            return next();
        }

        // Return error

        if (typeof request.route.settings.validate.failAction !== 'function') {
            return next(error);
        }

        // Custom handler

        request._protect.run('validate:input:failAction', next, function (exit) {

            var reply = request.server._replier.interface(request, request.route.realm, exit);
            request.route.settings.validate.failAction(request, reply, source, error);
        });
    };

    var localOptions = {
        context: {
            headers: request.headers,
            params: request.params,
            query: request.query,
            payload: request.payload,
            auth: {
                isAuthenticated: request.auth.isAuthenticated,
                credentials: request.auth.credentials
            }
        }
    };

    delete localOptions.context[source];
    Hoek.merge(localOptions, request.route.settings.validate.options);

    var schema = request.route.settings.validate[source];
    if (typeof schema !== 'function') {
        return Joi.validate(request[source], schema, localOptions, postValidate);
    }

    request._protect.run('validate:input', postValidate, function (exit) {

        return schema(request[source], localOptions, exit);
    });
};


exports.response = function (request, next) {

    if (request.route.settings.response.sample) {
        var currentSample = Math.ceil((Math.random() * 100));
        if (currentSample > request.route.settings.response.sample) {
            return next();
        }
    }

    var response = request.response;
    var statusCode = response.isBoom ? response.output.statusCode : response.statusCode;
    var source = response.isBoom ? response.output.payload : response.source;

    var statusSchema = request.route.settings.response.status[statusCode];
    if (statusCode >= 400 &&
        !statusSchema) {

        return next();          // Do not validate errors by default
    }

    var schema = statusSchema || request.route.settings.response.schema;
    if (schema === null) {
        return next();          // No rules
    }

    if ((!response.isBoom && request.response.variety !== 'plain') ||
        typeof source !== 'object') {

        return next(Boom.badImplementation('Cannot validate non-object response'));
    }

    var postValidate = function (err, value) {

        if (!err) {
            if (value !== undefined &&
                request.route.settings.response.modify) {

                if (response.isBoom) {
                    response.output.payload = value;
                }
                else {
                    response.source = value;
                }
            }

            return next();
        }

        // failAction: 'error', 'log'

        if (request.route.settings.response.failAction === 'log') {
            request._log(['validation', 'response', 'error'], err.message);
            return next();
        }

        return next(Boom.badImplementation(err.message));
    };

    var localOptions = {
        context: {
            headers: request.headers,
            params: request.params,
            query: request.query,
            payload: request.payload,
            auth: {
                isAuthenticated: request.auth.isAuthenticated,
                credentials: request.auth.credentials
            }
        }
    };

    Hoek.merge(localOptions, request.route.settings.response.options);

    if (typeof schema !== 'function') {
        return Joi.validate(source, schema, localOptions, postValidate);
    }

    request._protect.run('validate:response', postValidate, function (exit) {

        return schema(source, localOptions, exit);
    });
};
