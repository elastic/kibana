const { mockCluster } = require('./mock_cluster');

module.exports = {
  mockKbnServer,
};

function mockKbnServer(data, meta, version = '9.8.7') {
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
    kbnServer: {
      version,
      server,
    },
    cluster: callWithInternalUser,
  };
}
