import { SavedObjectsClient } from '../saved_objects/client';

async function getStatsForType(savedObjectsClient, type) {
  const { total } = await savedObjectsClient.find({ type, perPage: 0 });
  return { total };
}

export async function getStats(kibanaIndex, callAdminCluster) {
  const savedObjectsClient = new SavedObjectsClient(kibanaIndex, callAdminCluster);
  const types = ['dashboard', 'visualization', 'search', 'index-pattern'];
  const requests = types.map(type => getStatsForType(savedObjectsClient, type));
  const results = await Promise.all(requests);
  const stats = {};

  results.forEach((statsForType, index) => {
    stats[types[index]] = statsForType;
  });

  stats.index = kibanaIndex;
  return stats;
}
