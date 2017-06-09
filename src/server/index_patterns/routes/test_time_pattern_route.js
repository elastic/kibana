import Joi from 'joi';

export const createTestTimePatternRoute = pre => ({
  path: '/api/index_patterns/_test_time_pattern',
  method: 'GET',
  config: {
    pre: [pre.getIndexPatternsService],
    validate: {
      query: Joi.object().keys({
        pattern: Joi.string().required()
      }).default()
    },
    handler(req, reply) {
      const { indexPatterns } = req.pre;
      const { pattern } = req.query;

      reply(indexPatterns.testTimePattern({
        pattern,
      }));
    }
  }
});
