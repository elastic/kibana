import Joi from 'joi';
import { metaSchema } from '../client';

export const createBulkGetRoute = (prereqs) => ({
  path: '/api/saved_objects/bulk_get',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      payload: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        id: Joi.string().required(),
      }).required()),
      query: Joi.object().keys({
        meta: metaSchema,
      })
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;

      reply(savedObjectsClient.bulkGet(request.payload, request.query));
    }
  }
});
