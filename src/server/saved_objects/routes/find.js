import Joi from 'joi';
import { keysToCamelCaseShallow } from '../../../utils/case_conversion';

export const createFindRoute = (prereqs) => ({
  path: '/api/saved_objects/{type?}',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      params: Joi.object().keys({
        type: Joi.string()
      }),
      query: Joi.object().keys({
        per_page: Joi.number().min(0).default(20),
        page: Joi.number().min(0).default(1),
        type: Joi.string(),
        search: Joi.string().allow('').optional(),
        search_fields: [Joi.string(), Joi.array().items(Joi.string())],
        fields: [Joi.string(), Joi.array().items(Joi.string())]
      })
    },
    handler(request, reply) {
      const options = keysToCamelCaseShallow(request.query);

      if (request.params.type) {
        options.type = request.params.type;
      }

      reply(request.pre.savedObjectsClient.find(options));
    }
  }
});
