import Joi from 'joi';

export const createGetIdsRoute = (prereqs) => ({
  path: '/api/kibana/saved_objects/{type}/_ids',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required(),
      }).required()
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type } = request.params;

      reply(savedObjectsClient.getIds(type));
    }
  }
});
