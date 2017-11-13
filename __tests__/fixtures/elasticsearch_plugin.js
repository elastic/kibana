import MockElasticsearchClient from './elasticsearch';

export default {
  getCluster: () => ({
    getClient: () => new MockElasticsearchClient(),
  }),
  status: {
    once: () => Promise.resolve(),
  },
};
