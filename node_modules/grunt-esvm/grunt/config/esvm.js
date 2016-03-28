module.exports = function (grunt) {
  return {
    test: {
      options: {
        branch: 'master',
        nodes: 1,
        config: {
          cluster: {
            name: 'My Test Cluster'
          }
        }
      }
    }
  };
};