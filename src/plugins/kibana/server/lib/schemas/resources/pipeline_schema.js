const Joi = require('joi');

module.exports = Joi.array().items(Joi.object());
