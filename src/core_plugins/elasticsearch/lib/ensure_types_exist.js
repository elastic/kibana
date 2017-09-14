/**
 *  Checks that a kibana index has all of the types specified. Any type
 *  that is not defined in the existing index will be added via the
 *  `indicies.putMapping` API.
 *
 *  @param  {Object} options
 *  @property {Function} options.log a method for writing log messages
 *  @property {string} options.indexName name of the index in elasticsearch
 *  @property {Function} options.callCluster a function for executing client requests
 *  @property {Array<Object>} options.types an array of objects with `name` and `mapping` properties
 *                                        describing the types that should be in the index
 *  @return {Promise<undefined>}
 */
export async function ensureTypesExist({ log, indexName, callCluster, types }) {
  const index = await callCluster('indices.get', {
    index: indexName,
    feature: '_mappings'
  });

  // could be different if aliases were resolved by `indices.get`
  const resolvedName = Object.keys(index)[0];
  const mappings = index[resolvedName].mappings;
  const literalTypes = Object.keys(mappings);
  const v6Index = literalTypes.length === 1 && literalTypes[0] === 'doc';

  // our types aren't really es types, at least not in v6
  const typesDefined = Object.keys(
    v6Index
      ? mappings.doc.properties
      : mappings
  );

  for (const type of types) {
    if (v6Index && type.name === '_default_') {
      // v6 indices don't get _default_ types
      continue;
    }

    const defined = typesDefined.includes(type.name);
    if (defined) {
      continue;
    }

    log(['info', 'elasticsearch'], {
      tmpl: `Adding mappings to kibana index for SavedObject type "<%= typeName %>"`,
      typeName: type.name,
      typeMapping: type.mapping
    });

    if (v6Index) {
      await callCluster('indices.putMapping', {
        index: indexName,
        type: 'doc',
        body: {
          properties: {
            [type.name]: type.mapping
          }
        },
        update_all_types: true
      });
    } else {
      await callCluster('indices.putMapping', {
        index: indexName,
        type: type.name,
        body: type.mapping,
        update_all_types: true
      });
    }
  }
}
