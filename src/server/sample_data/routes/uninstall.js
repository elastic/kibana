import Joi from 'joi';

import { createIndexName } from './lib/create_index_name';
import { initUiSettings } from './lib/init_ui_settings';

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

      const deletePromises = sampleDataSet.savedObjects.map(async (savedObjectJson) => {
        return request.getSavedObjectsClient().delete(savedObjectJson.type, savedObjectJson.id);
      });
      try {
        await Promise.all(deletePromises);
      } catch (err) {
        // ignore delete error - may happen if saved objects are not loaded
      }

      try {
        const uiSettings = initUiSettings(server);
        const defaultIndexPattern = await uiSettings.get('defaultIndex');
        if (defaultIndexPattern) {
          const indexPatternSavedObjectJson = sampleDataSet.savedObjects.find(savedObjectJson => {
            return savedObjectJson.type === 'index-pattern';
          });
          if (indexPatternSavedObjectJson.id === defaultIndexPattern) {
            await uiSettings.set('defaultIndex', null);
          }
        }
      } catch (err) {
        console.warn(`sample_data uninstall errors while setting default index pattern. Error: ${err.message}`);
        return reply(`Unable to configure 'defaultIndex', see kibana logs for details`).code(500);
      }

      reply();
    }
  }
});
