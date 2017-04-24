import Joi from 'joi';

export const createMgetRoute = (prereqs) => ({
  path: '/api/kibana/saved_objects/_mget',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      payload: Joi.object().keys({
        reqs: Joi.array().min(1).items(
          Joi.object().keys({
            type: Joi.string().required(),
            id: Joi.string().required()
          })
        )
      }).required()
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { reqs } = request.payload;

      reply(savedObjectsClient.mget(reqs));
    }
  }
});
