import Joi from 'joi';

const UPDATE_SOURCE = `
  for (tag in ctx._source.tags) {
    if (tag.label == params.oldLabel) {
      tag.label = params.newLabel; tag.tagJSON = params.tagJSON;
    }
  }
`;

export const createUpdateRoute = (server) => {
  return {
    method: 'PUT',
    path: '/api/tags/{tagLabel}',
    config: {
      validate: {
        params: Joi.object().keys({
          tagLabel: Joi.string().required(),
        }).required(),
        payload: Joi.object({
          label: Joi.string().required(),
          color: Joi.string().required()
        }).required()
      },
      handler: async function (request, reply) {

        const { tagLabel } = request.params;
        const newLabel = request.payload.label;
        const tagJSON = JSON.stringify(request.payload);

        const params = {
          index: server.config().get('kibana.index'),
          body: {
            script: {
              source: UPDATE_SOURCE,
              params: {
                newLabel: newLabel,
                tagJSON: tagJSON,
                oldLabel: tagLabel
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
