import { createIndexName } from './lib/create_index_name';

const NOT_INSTALLED = 'not_installed';
const INSTALLED = 'installed';

export const createListRoute = () => ({
  path: '/api/sample_data',
  method: 'GET',
  config: {
    handler: async (request, reply) => {
      const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');

      const sampleDatasets = request.server.getSampleDatasets().map(sampleDataset => {
        return {
          id: sampleDataset.id,
          name: sampleDataset.name,
          description: sampleDataset.description,
          previewImagePath: sampleDataset.previewImagePath,
          overviewDashboard: sampleDataset.overviewDashboard,
          defaultIndex: sampleDataset.defaultIndex,
        };
      });

      const isInstalledPromises = sampleDatasets.map(async sampleDataset => {
        const index = createIndexName(request.server, sampleDataset.id);
        try {
          const indexExists = await callWithRequest(request, 'indices.exists', { index: index });
          if (!indexExists) {
            sampleDataset.status = NOT_INSTALLED;
            return;
          }
          const { count } = await callWithRequest(request, 'count', { index: index });
          sampleDataset.status = count > 0 ? INSTALLED : NOT_INSTALLED;
        } catch (err) {
          sampleDataset.status = 'unknown';
          sampleDataset.statusMsg = err.message;
        }
      });

      await Promise.all(isInstalledPromises);
      reply(sampleDatasets);
    }
  }
});
