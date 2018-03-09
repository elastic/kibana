import Joi from 'joi';
import { joinParameterSchema } from '../client';

export const createGetRoute = (prereqs) => ({
  path: '/api/saved_objects/{type}/{id}',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string().required(),
        id: Joi.string().required(),
      }).required(),
      query: Joi.object().keys({
        join: joinParameterSchema,
      })
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { type, id } = request.params;

      reply(savedObjectsClient.get(type, id, request.query));
    }
  }
});
