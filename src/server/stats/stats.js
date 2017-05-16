import { SavedObjectsClient } from '../saved_objects/client';

async function getStatsForType(savedObjectsClient, type) {
  const response = await savedObjectsClient.find({ type, perPage: 0 });
  return {
    total: response.total
  };
}

export async function getStats(kibanaIndex, callAdminCluster) {
  const savedObjectsClient = new SavedObjectsClient(kibanaIndex, callAdminCluster);
  const types = ['dashboard', 'visualization', 'search', 'index-pattern'];
  const stats = {};

  const requests = types.map(type => {
    return getStatsForType(savedObjectsClient, type);
  });
  const results = await Promise.all(requests);
  results.forEach((statsForType, index) => {
    stats[types[index]] = statsForType;
  });

  stats.index = kibanaIndex;
  return stats;
}
