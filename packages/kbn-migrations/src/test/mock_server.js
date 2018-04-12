const { mockCluster } = require('./mock_cluster');

export function mockServer(data, meta) {
  const callWithInternalUser = mockCluster(data, meta);
  const server = {
    plugins: {
      elasticsearch: {
        getCluster(name) {
          if (name !== 'admin') {
            throw new Error(`Expected cluster to be admin, but got "${name}".`);
          }
          return {
            callWithInternalUser,
          };
        },
      },
    },
    log: () => {},
  };
  return {
    server,
    cluster: callWithInternalUser,
  };
}
