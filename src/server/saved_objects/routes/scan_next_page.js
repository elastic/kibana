import Joi from 'joi';

export const createScanNextPageRoute = prereqs => ({
  path: '/api/kibana/saved_objects/{type}/_scan',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    validate: {
      payload: Joi.object().keys({
        next_page_id: Joi.string().required()
      }).required(),
    },
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;
      const { next_page_id: nextPageId } = request.payload;

      reply(savedObjectsClient.scanNextPage(nextPageId));
    }
  }
});
