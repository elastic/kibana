import Cluster from './cluster';

const clusters = new Map();

export function getCluster(name) {
  return clusters.get(name);
}

export function createCluster(name, config) {
  const cluster = new Cluster(config);
  clusters.set(name, cluster);

  return cluster;
}
