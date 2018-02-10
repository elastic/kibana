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
                size: 1000,
                order: {
                  _count: 'desc'
                }
              }
            }
          },
          size: 0
        }
      };

      const query = request.query.q;
      if (query) {
        params.body.query = {
          bool: {
            must: [
              { match_phrase_prefix: { 'tags.label': query } }
            ]
          }
        };
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      try {
        const esResp = await callWithRequest(request, 'search', params);
        let tags = _.get(esResp, 'aggregations.tags.buckets', []).map(bucket => {
          return JSON.parse(bucket.key);
        });
        if (query) {
          tags = tags.filter(tag => {
            // entire tags array gets added to buckets for a matching document, filter out non-matching tags
            return tag.label.includes(query);
          });
        }
        reply(tags);
      } catch (error) {
        reply('there was an error');
      }
    }
  };
};
