import Joi from 'joi';

export const createUpdateRoute = (prereqs) => {
  return {
    path: '/api/saved_objects/{type}/{id}',
    method: 'PUT',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        params: Joi.object().keys({
          type: Joi.string().required(),
          id: Joi.string().required(),
        }).required(),
        payload: Joi.object({
          attributes: Joi.object().required(),
          version: Joi.number().min(1)
        }).required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type, id } = request.params;
        const { attributes, version } = request.payload;
        const options = { version };

        reply(savedObjectsClient.update(type, id, attributes, options));
      }
    }
  };
};
