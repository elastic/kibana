import Joi from 'joi';

import { loadData } from './lib/load_data';

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
      const insertCmd = {
        index: {
          _index: index
        }
      };

      if (!sampleDataSet) {
        return reply().code(404);
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
        return reply(`Unable to create sample data index "${index}", see kibana logs for details`).code(500);
      }

      const now = (new Date()).getTime();
      const currentTimeMarker = Date.parse(sampleDataSet.currentTimeMarker);
      function updateTimestamps(doc) {
        sampleDataSet.timeFields.forEach(timeFieldName => {
          if (doc[timeFieldName]) {
            const timeFieldValue = Date.parse(doc[timeFieldName]);
            const timeDelta = timeFieldValue - currentTimeMarker;
            doc[timeFieldName] = (new Date(now + timeDelta)).toISOString();
          }
        });
        return doc;
      }
      const bulkLoad = async (docs) => {
        const bulk = [];
        docs.forEach(doc => {
          bulk.push(insertCmd);
          bulk.push(updateTimestamps(doc));
        });
        const resp = await callWithRequest(request, 'bulk', { body: bulk });
        if (resp.errors) {
          console.warn(`sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(resp, null, ' ')}`);
          return Promise.reject(new Error(`Unable to load sample data into index "${index}", see kibana logs for details`));
        }
      };
      loadData(sampleDataSet.dataPath, bulkLoad, (err, count) => {
        if (err) {
          return reply(err.message).code(500);
        }

        return reply({ count });
      });
    }
  }
});
