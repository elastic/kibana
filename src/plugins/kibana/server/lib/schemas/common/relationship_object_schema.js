const Joi = require('joi');

module.exports = Joi.object({
  data: Joi.object({
    type: Joi.string().required(),
    id: Joi.string().required()
  })
});

