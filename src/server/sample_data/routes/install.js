import Joi from 'joi';

import { loadData } from './lib/load_data';
import { createIndexName } from './lib/create_index_name';
import { adjustTimestamp } from './lib/adjust_timestamp';

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'POST',
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
      const index = createIndexName(server, sampleDataSet.id);
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

      const now = new Date();
      const currentTimeMarker = new Date(Date.parse(sampleDataSet.currentTimeMarker));
      function updateTimestamps(doc) {
        sampleDataSet.timeFields.forEach(timeFieldName => {
          if (doc[timeFieldName]) {
            doc[timeFieldName] = adjustTimestamp(doc[timeFieldName], currentTimeMarker, now, sampleDataSet.preserveDayOfWeekTimeOfDay);
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
      loadData(sampleDataSet.dataPath, bulkLoad, async (err, count) => {
        if (err) {
          return reply(err.message).code(500);
        }

        try {
          await request.getSavedObjectsClient().bulkCreate(sampleDataSet.savedObjects, { overwrite: true });
        } catch (err) {
          console.warn(`sample_data install errors while loading saved objects. Error: ${err.message}`);
          return reply(`Unable to load kibana saved objects, see kibana logs for details`).code(500);
        }

        return reply({ docsLoaded: count, kibanaSavedObjectsLoaded: sampleDataSet.savedObjects.length });
      });
    }
  }
});
