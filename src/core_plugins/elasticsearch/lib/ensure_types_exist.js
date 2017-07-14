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
  const esTypes = Object.keys(mappings);

  const isV5Index = esTypes.length > 1 || esTypes[0] !== 'doc';
  if (isV5Index) {
    throw new Error(
      'Support for Kibana index format v5 has been removed, reset your ' +
      `Kibana index or use the X-Pack Upgrade Assitant to upgrade "${indexName}"`
    );
  }

  const typesDefined = Object.keys(mappings.doc.properties);
  for (const type of types) {
    if (type.name === '_default_') {
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

    await callCluster('indices.putMapping', {
      index: indexName,
      type: 'doc',
      body: {
        properties: {
          [type.name]: type.mapping
        }
      }
    });
  }
}
