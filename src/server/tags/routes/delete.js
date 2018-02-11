import Joi from 'joi';

const DELETE_SOURCE = `
  Iterator itr = ctx._source.tags.iterator();
  while(itr.hasNext()) {
    Map nextTag = itr.next();
    if (nextTag.get('label') == params.removeLabel) { itr.remove(); }
  }
`;

export const createDeleteRoute = (server) => {
  return {
    method: 'DELETE',
    path: '/api/tags/{tagLabel}',
    config: {
      validate: {
        params: Joi.object().keys({
          tagLabel: Joi.string().required(),
        }).required(),
      },
      handler: async function (request, reply) {

        const { tagLabel } = request.params;

        const params = {
          index: server.config().get('kibana.index'),
          body: {
            script: {
              source: DELETE_SOURCE,
              params: {
                removeLabel: tagLabel,
              },
              lang: 'painless'
            },
            query: {
              bool: {
                must: [
                  { match: { 'tags.label': tagLabel } }
                ]
              }
            }
          }
        };

        const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
        try {
          const esResp = await callWithRequest(request, 'updateByQuery', params);
          reply(esResp);
        } catch (error) {
          reply(error);
        }
      }
    }
  };
};
