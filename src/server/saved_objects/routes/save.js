import Joi from 'joi';
import Boom from 'boom';

export const createSaveRoute = (prereqs) => {
  return {
    path: '/api/kibana/saved_objects/{type}/{id?}',
    method: ['POST', 'PUT'],
    config: {
      pre: [prereqs.getSavedObjectsClient],
      validate: {
        params: Joi.object().keys({
          type: Joi.string().required(),
          id: Joi.string().optional(),
        }).required(),
        query: Joi.object().keys({
          allow_title_conflict: Joi.boolean().optional().default(false),
          allow_overwrite: Joi.boolean().optional().default(false)
        }).required(),
        payload: Joi.object().keys({
          body: Joi.object().unknown(true).required()
        }).required()
      },
      handler(request, reply) {
        const { savedObjectsClient } = request.pre;
        const { type, id } = request.params;
        const { body } = request.payload;
        const updateOnly = request.method === 'put';

        if (updateOnly && !id) {
          return reply(Boom.badRequest(`unable to update ${type} without an id (use POST instead)`));
        }

        reply(savedObjectsClient.save(type, id, body, {
          updateOnly,
          allowTitleConflict: request.query.allow_title_conflict,
          allowOverwrite: request.query.allow_overwrite,
        }));
      }
    }
  };
};
