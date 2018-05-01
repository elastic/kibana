import { createIndexName } from './lib/create_index_name';

export const createListRoute = () => ({
  path: '/api/sample_data',
  method: 'GET',
  config: {
    handler: async (request, reply) => {
      const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');

      const sampleDataSets = request.server.getSampleDataSets().map(sampleDataSet => {
        return {
          id: sampleDataSet.id,
          name: sampleDataSet.name,
          description: sampleDataSet.description,
          overviewDashboard: sampleDataSet.overviewDashboard,
          defaultIndex: sampleDataSet.defaultIndex,
        };
      });

      const isInstalledPromises = sampleDataSets.map(async sampleDataSet => {
        const index = createIndexName(request.server, sampleDataSet.id);
        try {
          sampleDataSet.isInstalled = await callWithRequest(request, 'indices.exists', { index: index });
        } catch (err) {
          sampleDataSet.isInstalled = false;
        }
      });

      await Promise.all(isInstalledPromises);
      reply(sampleDataSets);
    }
  }
});
