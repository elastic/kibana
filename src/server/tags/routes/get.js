import _ from 'lodash';

export const createGetRoute = (kibanaIndex, callWithRequest) => {
  return {
    method: 'GET',
    path: '/api/tags',
    handler: async function (request, reply) {
      const params = {
        index: kibanaIndex,
        body: {
          aggs: {
            labels: {
              terms: {
                field: 'tags.label.keyword',
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

      try {
        const esResp = await callWithRequest(request, 'search', params);
        const labels = _.get(esResp, 'aggregations.labels.buckets', []).map(bucket => {
          return bucket.key;
        });
        reply(labels);
      } catch (error) {
        reply('there was an error');
      }
    }
  };
};
