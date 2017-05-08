import Joi from 'joi';

export const createFindRoute = (prereqs) => ({
  path: '/api/kibana/saved_objects/{type}/_find',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required(),
      }).required(),
      payload: Joi.object().keys({
        filter: Joi.string().empty('').optional(),
        size: Joi.number().required().default(100)
      }).required()
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type } = request.params;
      const { filter, size } = request.payload;

      reply(savedObjectsClient.find(type, {
        filter,
        size
      }));
    }
  }
});
