
import { snakeCase } from 'lodash';

async function getStatsForType(savedObjectsClient, type) {
  const { total } = await savedObjectsClient.find({ type, perPage: 0 });
  return { total };
}

export async function getStats(kibanaIndex, savedObjectsClient) {
  const types = ['dashboard', 'visualization', 'search', 'index-pattern'];
  const requests = types.map(type => getStatsForType(savedObjectsClient, type));
  const results = await Promise.all(requests);
  const stats = {};

  results.forEach((statsForType, index) => {
    stats[snakeCase(types[index])] = statsForType;
  });

  stats.index = kibanaIndex;
  return stats;
}
