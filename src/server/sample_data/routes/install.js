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
              _doc: {
                properties: sampleDataSet.fields
              }
            }
          }
        };
        await callWithRequest(request, 'indices.create', createIndexParams);
      } catch (err) {
        console.warn(`sample_data install errors while creating index. Error: ${err.message}`);
        reply(`Unable to create sample data index "${index}", see kibana logs for details`).code(500);
        return;
      }

      const bulkLoad = async (bulk) => {
        const resp = await callWithRequest(request, 'bulk', { body: bulk });
        if (resp.errors) {
          console.warn(`sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(resp, null, ' ')}`);
          return Promise.reject(new Error(`Unable to load sample data into index "${index}", see kibana logs for details`));
        }
      };
      loadData(sampleDataSet.dataPath, bulkLoad, index, updateRow, (err, count) => {
        if (err) {
          reply(err.message).code(500);
          return;
        }
        reply({ count });
      });
    }
  }
});
