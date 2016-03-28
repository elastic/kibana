// Load Modules

var Hoek = require('hoek');
var Joi = require('joi');

var internals = {};

exports.assert = function (type, options) {

    var error = Joi.validate(options, internals[type]).error;
    Hoek.assert(!error, 'Invalid', type, 'options', error);
};

internals.monitorOptions = Joi.object().keys({
    httpAgents: Joi.array(),
    httpsAgents: Joi.array(),
    requestHeaders: Joi.boolean(),
    requestPayload: Joi.boolean(),
    responsePayload: Joi.boolean(),
    opsInterval: Joi.number().integer().min(100),
    reporters: Joi.array().items(Joi.object(), Joi.string()),
    responseEvent: Joi.string().valid('response', 'tail'),
    extensions: Joi.array().items(Joi.string().invalid('log', 'request-error', 'ops', 'request', 'response', 'tail')),
    filter: Joi.object().pattern(/./, Joi.string())
}).unknown(false);
