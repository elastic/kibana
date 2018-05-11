const _ = require('lodash');
const { migrate } = require('../migration');
const { Plugin } = require('../lib');
const { mockCluster } = require('./mock_cluster');

const opts = {
  log: _.noop,
  elasticVersion: '3.2.1',
  index: '.test-index',
  callCluster: _.noop,
  plugins: [],
};

module.exports = {
  testCluster,
};

async function testCluster({ index = '.sample-index', plugins, existingDocs } = {}) {
  const callCluster = existingDocs ? clusterWithDocs(index, existingDocs) : mockCluster({});

  if (plugins) {
    await migrate({ ...opts, index, plugins: Plugin.sanitize(plugins), callCluster });
  }

  return { index, callCluster };
}

// Convenience function which, given an index name and a set of documents,
// returns the data and meta required to represent those docs in mockCluster.
function clusterWithDocs(index, docs) {
  const data = {
    [index]: docs.reduce((acc, { id, type, attributes }) => _.set(acc, `${type}:${id}`, {
      _source: {
        type,
        [type]: attributes,
      },
    }), {}),
  };

  const deriveMappings = (attributes) => ({
    properties: _.mapValues(attributes, (v) => typeof v === 'number' ? 'integer' : 'text')
  });

  const meta = {
    mappings: {
      [index]: {
        doc: {
          properties: docs.reduce((acc, { type, attributes }) => _.set(acc, type, deriveMappings(attributes)), {}),
        },
      },
    },
  };

  return mockCluster(data, meta);
}
