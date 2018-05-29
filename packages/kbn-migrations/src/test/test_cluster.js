/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const _ = require('lodash');
const { migrate } = require('../migration');
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
    await migrate({ ...opts, index, plugins, callCluster });
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
