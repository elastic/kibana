import Joi from 'joi';

import { loadData } from './lib/load_data';

function updateRow(row) {
  return row;
}

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'GET', // TODO change to POST but GET is easier to test because it works in browser
  config: {
    validate: {
      params: Joi.object().keys({
        id: Joi.string().required(),
      }).required()
    },
    handler: async (request, reply) => {
      const server = request.server;
      const sampleDataSet = server.getSampleDataSets().find(sampleDataSet => {
        return sampleDataSet.id === request.params.id;
      });
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const index = `${server.config().get('kibana.index')}_sample_data_${sampleDataSet.id}`;

      if (!sampleDataSet) {
        reply().code(404);
        return;
      }

      try {
        await callWithRequest(request, 'indices.delete', { index: index });
      } catch (err) {
        // ignore delete error. Happens if index does not exist.
      }

      try {
        const createIndexParams = {
          index: index,
          body: {
            settings: {
              index: {
                number_of_shards: 1,
                number_of_replicas: 0
              }
            },
            mappings: {
              doc: {
                properties: sampleDataSet.fields
              }
            }
          }
        };
        await callWithRequest(request, 'indices.create', createIndexParams);
      } catch (err) {
        reply().code(500);
      }


      loadData(sampleDataSet.dataPath, index, updateRow, (count) => {
        reply({ count });
      });
    }
  }
});
