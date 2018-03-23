import Joi from 'joi';

const attributesSchema = Joi.object().unknown().keys({
  tags: Joi.array().items(Joi.string()).optional()
});

const savedObjectSchema = Joi.object().keys({
  type: Joi.string().required(),
  id: Joi.string().required(),
  attributes: Joi.array().items(attributesSchema).required()
});

const validateOptions = {
  presence: 'required',
};

/**
 * Validate saved object attributes.
 *
 * @param {object} attributes
 * @returns {Object} - { error (Error object), value }
 */
export function validateAttributes(attributes) {
  return Joi.validate(attributes, attributesSchema, validateOptions);
}

/**
 * Validate bulk saved objects.
 *
 * @param {array} objects - [{ type, id, attributes }]
 * @returns {Object} - { error (Error object), value }
 */
export function validateBulkObjects(objects) {
  return Joi.validate(objects, Joi.array().items(savedObjectSchema), validateOptions);
}
