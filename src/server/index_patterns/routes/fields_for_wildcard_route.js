import Joi from 'joi';

export const createFieldsForWildcardRoute = pre => ({
  path: '/api/index_patterns/_fields_for_wildcard',
  method: 'GET',
  config: {
    pre: [pre.getIndexPatternsService],
    validate: {
      query: Joi.object().keys({
        pattern: Joi.string().required(),
        meta_fields: Joi.array().items(Joi.string()).default([])
      }).default()
    },
    handler(req, reply) {
      const { indexPatterns } = req.pre;
      const {
        pattern,
        meta_fields: metaFields,
      } = req.query;

      reply(
        indexPatterns.getFieldsForWildcard({
          pattern,
          metaFields
        })
        .then(fields => ({ fields }))
      );
    }
  }
});
