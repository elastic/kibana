import upgrade from './upgrade_config';

export default async function (server) {
  const savedObjectsClient = server.savedObjectsClientFactory({
    callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser
  });

  const { saved_objects: configSavedObjects } = await savedObjectsClient.find({
    type: 'config',
    page: 1,
    perPage: 1000,
    sortField: 'buildNum',
    sortOrder: 'desc'
  });

  return await upgrade(server, savedObjectsClient)(configSavedObjects);
}
