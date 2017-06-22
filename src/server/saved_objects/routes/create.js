import Joi from 'joi';

export const createCreateRoute = (prereqs) => {
  return {
    path: '/api/saved_objects/{type}',
    method: 'POST',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        query: Joi.object().keys({
          overwrite: Joi.boolean().default(false)
        }),
        params: Joi.object().keys({
          type: Joi.string().required()
        }).required(),
        payload: Joi.object({
          attributes: Joi.object().required(),
          id: Joi.string()
        }).required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type } = request.params;

        reply(savedObjectsClient.create(type, request.payload, request.query));
      }
    }
  };
};
