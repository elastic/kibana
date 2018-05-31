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
// A set of helper functions for calling Elasticsearch

const { DOC_TYPE, buildTransformFunction, seededDocs, toRaw } = require('./document');

module.exports = {
  applyTransforms,
  applySeeds,
  applyMappings,
  applyTransforms,
  bulkInsert,
  cloneIndexSettings,
  convertIndexToAlias,
  indexExists,
  aliasExists,
  createIndex,
  setAlias,
  setReadonly,
  fetchOrNull,
  getCurrentIndex,
  getMapping,
};

// Runs all transform migrations on docs in the sourceIndex and persists the resulting docs to destIndex
async function applyTransforms(callCluster, log, sourceIndex, destIndex, migrations, scrollSize = 100) {
  const migrationFn = buildTransformFunction(migrations);
  await eachScroll(callCluster, sourceIndex, async (scroll) => {
    const docs = scroll.hits.hits.map((doc) => toRaw(migrationFn(doc)));
    return bulkInsert(callCluster, log, destIndex, docs);
  }, scrollSize);
}

async function applyMappings(callCluster, index, mappings) {
  return await callCluster('indices.putMapping', {
    index,
    type: DOC_TYPE,
    body: mappings,
  });
}

async function applySeeds(callCluster, log, index, migrations) {
  const docs = seededDocs(migrations);
  if (docs.length) {
    await bulkInsert(callCluster, log, index, docs.map(toRaw));
  }
}

async function bulkInsert(callCluster, log, index, docs) {
  const bulkActions = [];
  docs.forEach((doc) => {
    bulkActions.push({
      index: {
        _index: index,
        _type: doc._type || DOC_TYPE,
        _id: doc._id,
      },
    });
    bulkActions.push(doc._source);
  });

  log.debug(() => `Bulk inserting...`);
  log.debug(() => bulkActions);
  const result = await callCluster('bulk', { body: bulkActions });
  const err = result.items.find(({ index: { error } }) => error && error.type && error.reason);
  if (err) {
    throw err;
  }
  return result;
}

// Copies the index settings from sourceIndex to destIndex
async function cloneIndexSettings(callCluster, sourceIndex, destIndex, mappings) {
  const settings = await getIndexSettings(callCluster, sourceIndex);
  const { index } = settings;
  return callCluster('indices.create', {
    index: destIndex,
    body: {
      mappings,
      settings: {
        index: {
          number_of_shards: index.number_of_shards,
          number_of_replicas: index.number_of_replicas,
        },
      },
    },
  });
}

// Moves sourceIndex to destIndex, and create an alias named sourceIndex that points to destIndex.
async function convertIndexToAlias(callCluster, sourceIndex, destIndex) {
  const mappings = await getMapping(callCluster, sourceIndex);
  await cloneIndexSettings(callCluster, sourceIndex, destIndex, mappings[sourceIndex].mappings);
  await reindex(callCluster, sourceIndex, destIndex);
  await callCluster('indices.updateAliases', {
    body: {
      actions: [
        { remove_index: { index: sourceIndex }, },
        { add: { index: destIndex, alias: sourceIndex }, }
      ],
    },
  });
}

function indexExists(callCluster, index) {
  return callCluster('indices.exists', { index });
}

function aliasExists(callCluster, alias) {
  return callCluster('indices.existsAlias', { name: alias });
}

function createIndex(callCluster, index, body) {
  return callCluster('indices.create', {
    index,
    body,
  });
}

async function fetchOrNull(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

// Points the specified alias to the specified index and removes any other
// indices from the alias.
async function setAlias(callCluster, alias, index) {
  const actions = await removeIndicesFromAlias(callCluster, alias);
  callCluster('indices.updateAliases', {
    body: {
      actions: [...actions, { add: { index, alias } }],
    },
  });
}

function setReadonly(callCluster, index, readOnly = true) {
  return callCluster('indices.putSettings', {
    index,
    body: {
      index: {
        'blocks.read_only': readOnly,
      },
    },
  });
}

async function getCurrentIndex(callCluster, index) {
  const currentAlias = await fetchOrNull(callCluster('indices.getAlias', { name: index }));
  if (currentAlias) {
    return Object.keys(currentAlias)[0];
  }
}

function getMapping(callCluster, index) {
  return fetchOrNull(callCluster('indices.getMapping', { index, ignoreUnavailable: true }));
}

async function removeIndicesFromAlias(callCluster, alias) {
  const currentAlias = await fetchOrNull(callCluster('indices.getAlias', { name: alias }));
  if (!currentAlias) {
    return [];
  }
  const currentIndices = Object.keys(currentAlias);
  const actions = currentIndices.map(k => ({
    remove: { index: k, alias }
  }));
  // We can't remove a read-only index from the alias, so we need to ensure they are writable
  await Promise.all(currentIndices.map(index => setReadonly(callCluster, index, false)));
  return actions;
}

// Result has an unpredictable shape: {index-name: {settings: ...}}
// Where index name might be: 'kibana-213423423' so, we just grab the settings
// from the first value.
async function getIndexSettings(callCluster, index) {
  const result = await callCluster('indices.getSettings', { index });
  return Object.values(result)[0].settings;
}

async function eachScroll(callCluster, index, eachFn, size = 100) {
  const scroll = '1m';
  let result = await callCluster('search', { index, scroll, body: { size } });

  while (result.hits.hits.length) {
    await eachFn(result);
    result = await callCluster('scroll', { scrollId: result._scroll_id, scroll });
  }
}

function reindex(callCluster, sourceIndex, destIndex) {
  return callCluster('reindex', {
    waitForCompletion: true,
    refresh: true,
    body: {
      source: {
        index: sourceIndex,
      },
      dest: {
        index: destIndex,
      },
    },
  });
}
