import Joi from 'joi';

export const createDefineTypeRoute = prereqs => ({
  method: 'POST',
  path: '/api/kibana/saved_objects/types/{type}',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required()
      }),
      payload: Joi.object().keys({
        mapping: Joi.object().unknown(true).required()
      }).required()
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type } = request.params;
      const { mapping } = request.payload;

      reply(savedObjectsClient.defineType(type, mapping));
    }
  }
});
