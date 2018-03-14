import {
  getTypes,
  getRootType,
  getRootProperties
} from '../../../server/mappings';

/**
 *  Checks that the root type in the kibana index has all of the
 *  root properties specified by the kibanaIndexMappings.
 *
 *  @param  {Object} options
 *  @property {Function} options.log
 *  @property {string} options.indexName
 *  @property {Function} options.callCluster
 *  @property {EsMappingsDsl} options.kibanaIndexMappingsDsl
 *  @return {Promise<undefined>}
 */
export async function patchKibanaIndex(options) {
  const {
    log,
    indexName,
    callCluster,
    kibanaIndexMappingsDsl
  } = options;

  const rootEsType = getRootType(kibanaIndexMappingsDsl);
  const currentMappingsDsl = await getCurrentMappings(callCluster, indexName, rootEsType);

  // patchKibanaIndex() should do nothing if there are no current mappings
  if (!currentMappingsDsl) {
    return;
  }

  const missingProperties = await getMissingRootProperties(currentMappingsDsl, kibanaIndexMappingsDsl);

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
    },
    update_all_types: true
  });
}

/**
 *  Get the mappings dsl for the current Kibana index if it exists
 *  @param  {Function} callCluster
 *  @param  {string} indexName
 *  @param  {string} rootEsType
 *  @return {EsMappingsDsl|undefined}
 */
async function getCurrentMappings(callCluster, indexName, rootEsType) {
  const response = await callCluster('indices.getMapping', {
    index: indexName,
    ignore: [404],
  });

  if (response.status === 404) {
    return undefined;
  }

  // could be different if aliases were resolved by `indices.get`
  const resolvedName = Object.keys(response)[0];
  const currentMappingsDsl = response[resolvedName].mappings;
  const currentTypes = getTypes(currentMappingsDsl);

  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== rootEsType;
  if (isV5Index) {
    throw new Error(
      'Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant.'
    );
  }

  return currentMappingsDsl;
}

/**
 *  Get the properties that are in the expectedMappingsDsl but not the
 *  currentMappingsDsl. Properties will be an object of properties normally
 *  found at `[index]mappings[typeName].properties` is es mapping responses
 *
 *  @param  {EsMappingsDsl} currentMappingsDsl
 *  @param  {EsMappingsDsl} expectedMappingsDsl
 *  @return {PropertyMappings}
 */
async function getMissingRootProperties(currentMappingsDsl, expectedMappingsDsl) {
  const expectedProps = getRootProperties(expectedMappingsDsl);
  const existingProps = getRootProperties(currentMappingsDsl);

  return Object.keys(expectedProps)
    .reduce((acc, prop) => {
      if (existingProps[prop]) {
        return acc;
      } else {
        return { ...acc, [prop]: expectedProps[prop] };
      }
    }, {});
}
