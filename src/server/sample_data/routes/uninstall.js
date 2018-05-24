import _ from 'lodash';
import Joi from 'joi';

import { createIndexName } from './lib/create_index_name';

export const createUninstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'DELETE',
  config: {
    validate: {
      params: Joi.object().keys({
        id: Joi.string().required(),
      }).required()
    },
    handler: async (request, reply) => {
      const server = request.server;
      const sampleDataset = server.getSampleDatasets().find(({ id }) => {
        return id === request.params.id;
      });

      if (!sampleDataset) {
        reply().code(404);
        return;
      }

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const index = createIndexName(server, sampleDataset.id);

      try {
        await callWithRequest(request, 'indices.delete', { index: index });
      } catch (err) {
        return reply(`Unable to delete sample data index "${index}", error: ${err.message}`).code(err.status);
      }

      const deletePromises = sampleDataset.savedObjects.map((savedObjectJson) => {
        return request.getSavedObjectsClient().delete(savedObjectJson.type, savedObjectJson.id);
      });
      try {
        await Promise.all(deletePromises);
      } catch (err) {
        // ignore 404s since users could have deleted some of the saved objects via the UI
        if (_.get(err, 'output.statusCode') !== 404) {
          return reply(`Unable to delete samle dataset saved objects, error: ${err.message}`).code(403);
        }
      }

      reply();
    }
  }
});
