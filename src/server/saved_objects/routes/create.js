import Joi from 'joi';

export const createCreateRoute = (prereqs) => {
  return {
    path: '/api/saved_objects/{type}',
    method: 'POST',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        params: Joi.object().keys({
          type: Joi.string().required()
        }).required(),
        payload: Joi.object({
          attributes: Joi.object().required()
        }).required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type } = request.params;
        const { attributes } = request.payload;

        reply(savedObjectsClient.create(type, attributes));
      }
    }
  };
};
