import Joi from 'joi';

export const searchIndicesRoute = pre => ({
  path: '/api/indices/search',
  method: 'GET',
  config: {
    pre: [pre.getIndicesDataService, pre.getIndicesAdminService],
    validate: {
      query: Joi.object().keys({
        pattern: Joi.string().required(),
        maxNumberOfMatchingIndices: Joi.number(),
        useDataCluster: Joi.boolean().default(true)
      }).default()
    },
    handler(req, reply) {
      const { dataIndices, adminIndices } = req.pre;
      const {
        pattern,
        maxNumberOfMatchingIndices,
        useDataCluster
      } = req.query;

      const search = useDataCluster
        ? dataIndices.search({ pattern, maxNumberOfMatchingIndices })
        : adminIndices.search({ pattern, maxNumberOfMatchingIndices });

      reply(search.then(indices => ({ indices })));
    }
  }
});
