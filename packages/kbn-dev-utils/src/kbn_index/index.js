export const KbnIndex = {
  clear,
};

// Clear the index w/out wiping migration state.
function clear(kbnServer) {
  const cluster = kbnServer.server.plugins.elasticsearch.getCluster('admin');
  const { callWithInternalUser } = cluster;
  const index = kbnServer.config.get('kibana.index');
  return callWithInternalUser('deleteByQuery', {
    index,
    body: {
      query: {
        bool: {
          must_not: {
            ids: {
              values: ['migration:migration-state'],
            },
          },
        },
      },
    },
  });
}
