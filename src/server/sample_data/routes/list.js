import _ from 'lodash';
import { createIndexName } from './lib/create_index_name';

const NOT_INSTALLED = 'not_installed';
const INSTALLED = 'installed';
const UNKNOWN = 'unknown';

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
          if (count === 0) {
            sampleDataset.status = NOT_INSTALLED;
            return;
          }
        } catch (err) {
          sampleDataset.status = UNKNOWN;
          sampleDataset.statusMsg = err.message;
          return;
        }

        try {
          await request.getSavedObjectsClient().get('dashboard', sampleDataset.overviewDashboard);
        } catch (err) {
          // savedObjectClient.get() throws an boom error when object is not found.
          if (_.get(err, 'output.statusCode') === 404) {
            sampleDataset.status = NOT_INSTALLED;
            return;
          }

          sampleDataset.status = UNKNOWN;
          sampleDataset.statusMsg = err.message;
          return;
        }

        sampleDataset.status = INSTALLED;
      });

      await Promise.all(isInstalledPromises);
      reply(sampleDatasets);
    }
  }
});
