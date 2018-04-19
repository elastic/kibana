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
      const sampleDataSet = server.getSampleDataSets().find(sampleDataSet => {
        return sampleDataSet.id === request.params.id;
      });
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const index = createIndexName(server, sampleDataSet.id);

      if (!sampleDataSet) {
        reply().code(404);
        return;
      }

      try {
        await callWithRequest(request, 'indices.delete', { index: index });
      } catch (err) {
        // ignore delete error. Happens if index does not exist.
      }

      reply();
    }
  }
});
