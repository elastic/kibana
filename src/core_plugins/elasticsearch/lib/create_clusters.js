import { Cluster } from './cluster';

export function createClusters(server) {
  const clusters = new Map();

  server.on('stop', () => {
    for (const [name, cluster] of clusters) {
      cluster.close();
      clusters.delete(name);
    }
  });

  return {
    get(name) {
      return clusters.get(name);
    },

    create(name, config) {
      const cluster = new Cluster(config);

      if (clusters.has(name)) {
        throw new Error(`cluster '${name}' already exists`);
      }

      clusters.set(name, cluster);

      return cluster;
    }
  };
}
