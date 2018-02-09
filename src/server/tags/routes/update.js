import Joi from 'joi';

export const createUpdateRoute = (kibanaIndex, callWithRequest) => {
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
        const { label, color } = request.payload;

        const params = {
          index: kibanaIndex,
          body: {
            script: {
              source: 'for (tag in ctx._source.tags) { if (tag.label == params.oldLabel){ tag.label = params.newLabel; tag.color = params.newColor; } }',
              params: {
                newLabel: label,
                newColor: color,
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
