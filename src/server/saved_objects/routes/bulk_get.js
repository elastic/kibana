import Joi from 'joi';

export const createBulkGetRoute = (prereqs) => ({
  path: '/api/saved_objects/_bulk_get',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      payload: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        id: Joi.string().required(),
      }).required())
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;

      reply(savedObjectsClient.bulkGet(request.payload));
    }
  }
});
