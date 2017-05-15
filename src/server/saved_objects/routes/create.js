import Joi from 'joi';
import { has } from 'lodash';

export const createCreateRoute = (prereqs) => {
  return {
    path: '/api/kibana/saved_objects/{type}/{id?}',
    method: 'POST',
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        params: Joi.object().keys({
          type: Joi.string().required(),
          id: Joi.string()
        }).required(),
        payload: Joi.object().required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type } = request.params;
        const body = Object.assign({}, request.payload);

        if (has(request.params, 'id')) {
          body.id = request.params.id;
        }

        reply(savedObjectsClient.create(type, body));
      }
    }
  };
};
