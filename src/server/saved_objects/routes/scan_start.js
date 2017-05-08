import Joi from 'joi';

export const createScanStartRoute = (prereqs) => ({
  path: '/api/kibana/saved_objects/{type}/_scan',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required()
      }).required(),
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type } = request.params;

      reply(savedObjectsClient.scanStart(type));
    }
  }
});
