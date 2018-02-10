import _ from 'lodash';

export const createGetRoute = (server) => {
  return {
    method: 'GET',
    path: '/api/tags',
    handler: async function (request, reply) {

      const params = {
        index: server.config().get('kibana.index'),
        body: {
          aggs: {
            tags: {
              terms: {
                field: 'tags.tagJSON',
                size: 100,
                order: {
                  _count: 'desc'
                }
              }
            }
          },
          size: 0
        }
      };

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      try {
        const esResp = await callWithRequest(request, 'search', params);
        const tags = _.get(esResp, 'aggregations.tags.buckets', []).map(bucket => {
          return JSON.parse(bucket.key);
        });
        reply(tags);
      } catch (error) {
        reply('there was an error');
      }
    }
  };
};
