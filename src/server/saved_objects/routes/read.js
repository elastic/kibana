import Joi from 'joi';

export const createReadRoute = (prereqs) => ({
  path: '/api/saved_objects/{type}/{id}',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required(),
        id: Joi.string().required(),
      }).required()
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type, id } = request.params;

      reply(savedObjectsClient.get(type, id));
    }
  }
});
