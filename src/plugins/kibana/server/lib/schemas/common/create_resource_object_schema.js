const Joi = require('joi');

module.exports = function (attributes, relationships) {
  const resource = {
    type: Joi.string().required(),
    id: Joi.string().required(),
    attributes: attributes
  };
  if (relationships) {
    resource.relationships = relationships;
  }

  return Joi.object(resource);
};

