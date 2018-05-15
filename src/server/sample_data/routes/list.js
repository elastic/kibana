import { createIndexName } from './lib/create_index_name';

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
          sampleDataset.isInstalled = await callWithRequest(request, 'indices.exists', { index: index });
        } catch (err) {
          sampleDataset.isInstalled = false;
        }
      });

      await Promise.all(isInstalledPromises);
      reply(sampleDatasets);
    }
  }
});
