// This file provides a mock Elasticsearch connection function. It tries to mimic
// ElasticSearch as closely as possible for the sake of testing migrations.
// Rather than spying, etc, our tests actually run a migration against a virtual
// instance of Elasticsearch and compare the resulting indices with expectations.
// The upside to this is our tests run fast, and we catch a lot of edge cases.
// The downside, is we run the risk of testing our mock instead of testing our
// actual migration logic.

import _ from 'lodash';

export function mockCluster(data, meta) {
  // This is used to track non-document information about
  // the state of the Elastic cluster.
  meta = {
    mappings: {},
    aliases: {},
    settings: {},
    ...(meta || {}),
  };

  const commands = mockElasticSearchCommands(data, meta);

  function callCluster(command, opts) {
    const fn = commands[command];
    if (!fn) {
      throw new Error(`Command "${command}" could not be found.`);
    }
    return makePromise(fn(opts), command, opts);
  }

  callCluster.state = () => ({ data, meta });

  return callCluster;
}

function makePromise(obj, command, opts) {
  if (obj === undefined) {
    return reject(404, `Undefined returned from callCluster: ${JSON.stringify({ command, opts })}`);
  }
  if (obj && obj.hasOwnProperty('then')) {
    return obj;
  }
  return Promise.resolve(obj);
}

function reject(statusCode, message) {
  return Promise.reject({ statusCode, message });
}

function mockElasticSearchCommands(data, meta) {
  // Used to track scroll state between calls to search/scroll
  const scrolls = [];

  // The virtual elastic search methods
  return {
    'indices.existsAlias': aliasExists,
    'indices.exists': indexExists,
    'indices.getAlias': getAlias,
    'get': getDoc,
    'indices.create': createIndex,
    'update': updateDoc,
    'indices.updateAliases': updateAliases,
    'indices.putMapping': putMapping,
    'indices.getSettings': getSettings,
    'reindex': reindex,
    'indices.delete': deleteIndex,
    'indices.putAlias': putAlias,
    'indices.putSettings': putSettings,
    'indices.getMapping': getMapping,
    'bulk': bulkInsert,
    'search': search,
    'scroll': scroll,
  };

  function assertMappings(index, doc) {
    const mappings = meta.mappings[index];
    if (!mappings) {
      throw new Error(`Mappings don't exist for index ${index}`);
    }
    const { properties } = mappings.doc;
    const invalidProperty = Object.keys(doc).find(k => !properties[k]);
    if (invalidProperty) {
      throw new Error(`Property "${invalidProperty}" does not exist in mappings for index "${index}: ${JSON.stringify(doc)}`);
    }
  }

  function aliasExists({ name }) {
    return !!meta.aliases[name];
  }

  function indexExists({ index }) {
    return !!data[index] || aliasExists({ name: index });
  }

  function unAlias(index) {
    return aliasExists({ name: index }) ? Object.keys(meta.aliases[index])[0] : index;
  }

  function tryUnAlias(index) {
    if (!indexExists({ index })) {
      throw new Error(`Index ${index} does not exist.`);
    }
    return unAlias(index);
  }

  function createIndex({ index, body: { mappings, settings } }) {
    if (indexExists({ index })) {
      return reject(400, `Index ${index} exists!`);
    }
    data[index] = {};
    meta.mappings[index] = _.cloneDeep(mappings);
    if (settings) {
      meta.settings[index] = settings;
    }
    return Promise.resolve({
      acknowledged: true,
      shards_acknowledged: true,
      index,
    });
  }

  function getAlias({ name }) {
    return meta.aliases[name];
  }

  function putAlias({ index, name }) {
    const existingAlias = getAlias({ name }) || {};
    _.set(existingAlias, [index, 'aliases', name], {});
    meta.aliases[name] = existingAlias;
    return true;
  }

  function deleteIndex({ index }) {
    index = tryUnAlias(index);
    delete data[index];
    delete meta.mappings[index];
    delete meta.settings[index];
    return true;
  }

  function reindex({ body: { source, dest } }) {
    const destIndex = tryUnAlias(dest.index);
    const sourceIndex = tryUnAlias(source.index);
    Object.assign(data[destIndex], data[sourceIndex]);
    return true;
  }

  function getDocSync({ index, id, type }) {
    index = unAlias(index);
    assertDocType(type);
    return _.get(data, [index, id]);
  }

  function getDoc({ index, id, type }) {
    const result = getDocSync({ index, id, type });
    return result ? Promise.resolve(result) : reject(404, `getDoc ${index}, ${id}, ${type}`);
  }

  async function updateDoc({ index, version, id, type, body }) {
    index = unAlias(index);
    assertDocType(type);
    const existing = getDocSync({ index, type, id });
    if (!existing && !body.doc_as_upsert) {
      return reject(404, `updateDoc ${index}, ${id}, ${type}`);
    }
    if (existing && _.isNumber(version) && version !== existing._version) {
      return reject(409, `updateDoc ${index}, ${id}, ${type}`);
    }
    if (!body.doc) {
      return reject(500, `updateDoc ${index}, ${id}, ${type}`);
    }
    _.set(data, [index, id], {
      _source: body.doc,
      _version: ((existing && existing._version) || version || 0) + 1,
    });
    return true;
  }

  function updateAliases({ body }) {
    const { actions } = body;
    const addAlias = ({ index, alias }) => putAlias({ index, name: alias });
    const removeAlias = ({ index, alias }) => {
      const existingAlias = getAlias({ name: alias }) || {};
      delete existingAlias[index];
      return true;
    };
    actions.forEach((action) => {
      if (action.add) {
        addAlias(action.add);
      }
      if (action.remove) {
        removeAlias(action.remove);
      }
    });
    return true;
  }

  function putMapping({ index, type, body }) {
    index = tryUnAlias(index);
    const mappings = _.get(meta, ['mappings', index, type, 'properties']) || {};
    const newMappings = Object.assign({}, mappings, body.properties);
    _.set(meta, ['mappings', index, type, 'properties'], newMappings);
    return true;
  }

  function getMapping({ index }) {
    const mappings = _.cloneDeep(meta.mappings[tryUnAlias(index)]);
    if (mappings) {
      return {
        [index]: {
          mappings,
        },
      };
    }
  }

  function getSettings({ index }) {
    index = tryUnAlias(index);
    return {
      [index]: {
        settings: meta.settings[index] || {
          index: {
            number_of_replicas: '42',
            number_of_shards: '7',
          },
        },
      },
    };
  }

  function putSettings({ index, body }) {
    index = tryUnAlias(index);
    const settings = meta.settings[index] || {};
    meta.settings[index] = {
      ...settings,
      index: {
        ...(settings.index || {}),
        ...body.index,
      },
    };
    return true;
  }

  function bulkInsert({ body }) {
    const pairs = _.chunk(body, 2);
    pairs.forEach(([cmd, _source]) => {
      const { _index, _type, _id } = cmd.index;
      assertDocType(_type);
      assertMappings(_index, _source);
      _.set(data, [_index, _id], { _source });
    });
    return { items: [] };
  }

  // This is currenty only used for scrolling through all docs...
  function search({ index, body }) {
    const { size } = body;
    index = unAlias(index);
    const docs = _.chunk(_.map(data[index], (doc, _id) => ({ ...doc, _id })), size);
    scrolls.push({ index: 0, docs });
    return {
      _scroll_id: scrolls.length - 1,
      hits: {
        hits: docs[0] || [],
      },
    };
  }

  function scroll({ scrollId }) {
    const scrollState = scrolls[scrollId];
    ++scrollState.index;
    const result = scrollState.docs[scrollState.index];
    return {
      _scroll_id: scrollId,
      hits: { hits: result || [] }
    };
  }

  function assertDocType(type) {
    if (type !== 'doc') {
      throw new Error(`Unexpected type "${type}"`);
    }
  }
}
