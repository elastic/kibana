import { getRootType, getRootProperties } from '../../../server/mappings';

/**
 *  Checks that a kibana index has all of the types specified. Any type
 *  that is not defined in the existing index will be added via the
 *  `indicies.putMapping` API.
 *
 *  @param  {Object} options
 *  @property {Function} options.log a method for writing log messages
 *  @property {string} options.indexName name of the index in elasticsearch
 *  @property {Function} options.callCluster a function for executing client requests
 *  @property {Array<Object>} options.mapping the combined mapping dsl for the kibana index
 *                                            that will be available after the patch completes
 *  @return {Promise<undefined>}
 */
export async function patchKibanaIndex({ log, indexName, callCluster, mappings }) {
  const rootEsType = getRootType(mappings);
  const currentMappings = await getCurrentMappings(callCluster, indexName, rootEsType);
  const missingProperties = await getMissingRootProperties(currentMappings, mappings);

  const missingPropertyNames = Object.keys(missingProperties);
  if (!missingPropertyNames.length) {
    // all expected properties are in current mapping
    return;
  }

  // log about new properties
  log(['info', 'elasticsearch'], {
    tmpl: `Adding mappings to kibana index for SavedObject types "<%= names.join('", "') %>"`,
    names: missingPropertyNames
  });

  // add the new properties to the index mapping
  await callCluster('indices.putMapping', {
    index: indexName,
    type: rootEsType,
    body: {
      properties: missingProperties
    }
  });
}

/**
 *  Get the mappings dsl for the current Kibana index
 *  @param  {Function} callCluster
 *  @param  {string} indexName
 *  @param  {string} rootEsType  [description]
 *  @return {EsMappingsDsl}
 */
async function getCurrentMappings(callCluster, indexName, rootEsType) {
  const index = await callCluster('indices.get', {
    index: indexName,
    feature: '_mappings'
  });

  // could be different if aliases were resolved by `indices.get`
  const resolvedName = Object.keys(index)[0];
  const currentMappings = index[resolvedName].mappings;
  const currentTypes = Object.keys(currentMappings);

  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== rootEsType;
  if (isV5Index) {
    throw new Error(
      'Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant.'
    );
  }

  return currentMappings;
}

/**
 *  The the properties that are in `expecting`
 *  @param  {[type]} currentMappings  [description]
 *  @param  {[type]} expectedMappings [description]
 *  @return {[type]}                 [description]
 */
async function getMissingRootProperties(currentMappings, expectedMappings) {
  const expectedProps = getRootProperties(expectedMappings);
  const existingProps = getRootProperties(currentMappings);

  return Object.keys(expectedProps)
    .reduce((acc, prop) => {
      if (existingProps[prop]) {
        return acc;
      } else {
        return { ...acc, [prop]: expectedProps[prop] };
      }
    }, {});
}
