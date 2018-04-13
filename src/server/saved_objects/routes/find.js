import Joi from 'joi';
import { keysToCamelCaseShallow } from '../../../utils/case_conversion';

export const createFindRoute = (prereqs) => ({
  path: '/api/saved_objects/_find',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: Joi.object().keys({
        per_page: Joi.number().min(0).default(20),
        page: Joi.number().min(0).default(1),
        type: Joi.string(),
        search: Joi.string().allow('').optional(),
        search_fields: Joi.array().items(Joi.string()).single(),
        fields: Joi.array().items(Joi.string()).single()
      }).default()
    },
    handler(request, reply) {
      const options = keysToCamelCaseShallow(request.query);
      reply(request.pre.savedObjectsClient.find(options));
    }
  }
});
