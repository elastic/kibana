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
        // ignore delete error. Happens if index does not exist.
      }

      const deletePromises = sampleDataset.savedObjects.map((savedObjectJson) => {
        return request.getSavedObjectsClient().delete(savedObjectJson.type, savedObjectJson.id);
      });
      try {
        await Promise.all(deletePromises);
      } catch (err) {
        // ignore delete error - may happen if saved objects are not loaded
      }

      reply();
    }
  }
});
