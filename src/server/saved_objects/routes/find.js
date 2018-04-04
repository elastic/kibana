import Joi from 'joi';
import { keysToCamelCaseShallow } from '../../../utils/case_conversion';

const querySchema = Joi.object().keys({
  per_page: Joi.number().min(0).default(20),
  page: Joi.number().min(0).default(1),
  type: Joi.string(),
  search: Joi.string().allow('').optional(),
  search_fields: Joi.array().items(Joi.string()).single(),
  fields: Joi.array().items(Joi.string()).single()
}).default();

export const createFindRoute = (prereqs) => ({
  path: '/api/saved_objects/_find',
  method: 'GET',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      query: querySchema
    },
    handler(request, reply) {
      const options = keysToCamelCaseShallow(request.query);
      reply(request.pre.savedObjectsClient.find(options));
    }
  }
});

export const createFindPostRoute = (prereqs) => ({
  path: '/api/saved_objects/_find',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    payload: {
      output: 'data',
      parse: true,
      allow: 'application/json'
    },
    validate: {
      query: querySchema,
      payload: Joi.object().keys({
        // experimentalFilter is validated in SavedObjectClient because
        // it is pretty complicated and we can produce better, more
        // detailed error messages than Joi can
        experimental_filter: Joi.object()
      }).default()
    },
    handler(request, reply) {
      const options = keysToCamelCaseShallow({
        ...request.query,
        ...request.payload.experimental_filter,
      });

      reply(request.pre.savedObjectsClient.find(options));
    }
  }
});
