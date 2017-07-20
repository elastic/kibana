import Joi from 'joi';

export const createFieldsForTimePatternRoute = pre => ({
  path: '/api/index_patterns/_fields_for_time_pattern',
  method: 'GET',
  config: {
    pre: [pre.getIndexPatternsService],
    validate: {
      query: Joi.object().keys({
        pattern: Joi.string().required(),
        look_back: Joi.number().min(1).required(),
        meta_fields: Joi.array().items(Joi.string()).default([]),
      }).default()
    },
    handler(req, reply) {
      const { indexPatterns } = req.pre;
      const {
        pattern,
        interval,
        look_back: lookBack,
        meta_fields: metaFields,
      } = req.query;

      reply(
        indexPatterns.getFieldsForTimePattern({
          pattern,
          interval,
          lookBack,
          metaFields
        })
        .then(fields => ({ fields }))
      );
    }
  }
});
