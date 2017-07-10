import upgrade from './upgrade_config';
import { SavedObjectsClient } from '../../../server/saved_objects';

export default async function (server, { mappings }) {
  const config = server.config();
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');

  const savedObjectsClient = new SavedObjectsClient(config.get('kibana.index'), mappings, callWithInternalUser);
  const { saved_objects: configSavedObjects } = await savedObjectsClient.find({
    type: 'config',
    page: 1,
    perPage: 1000,
    sortField: 'buildNum',
    sortOrder: 'desc'
  });

  return await upgrade(server, savedObjectsClient)(configSavedObjects);
}
