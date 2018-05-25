import Joi from 'joi';

export const createCreateRoute = (prereqs) => {
  return {
    path: '/api/saved_objects/{type}/{id?}',
    method: 'POST',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        query: Joi.object().keys({
          overwrite: Joi.boolean().default(false)
        }).default(),
        params: Joi.object().keys({
          type: Joi.string().required(),
          id: Joi.string()
        }).required(),
        payload: Joi.object({
          migrationState: Joi.object().optional(),
          attributes: Joi.object().required()
        }).required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type, id } = request.params;
        const { overwrite } = request.query;
        const { migrationState, attributes } = request.payload;
        const options = { id, overwrite, migrationState };

        reply(savedObjectsClient.create(type, attributes, options));
      }
    }
  };
};
