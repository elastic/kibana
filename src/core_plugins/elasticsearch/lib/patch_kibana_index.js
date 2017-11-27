import {
  getTypes,
  getRootType,
  getRootProperties
} from '../../../server/mappings';

import { get } from 'lodash';

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

  const {
    missingPropertyNames: missingRootPropertyNames,
    updatedMappings: updatedRootMappings
  } = await getMissingRootProperties(currentMappingsDsl, kibanaIndexMappingsDsl);

  const {
    missingPropertyNames: missingTitleFieldPropertyNames,
    updatedMappings: updatedTitleFieldMappings
  } = await getMissingUnanalyzedTitleFields(currentMappingsDsl, kibanaIndexMappingsDsl);

  if (!missingRootPropertyNames.length && !missingTitleFieldPropertyNames.length) {
    // all expected properties are in current mapping
    return;
  }

  const missingPropertyNames = [
    ...missingRootPropertyNames,
    ...missingTitleFieldPropertyNames,
  ];

  // log about new properties
  log(['info', 'elasticsearch'], {
    tmpl: `Adding mappings to kibana index for SavedObject types "<%= names.join('", "') %>"`,
    names: missingPropertyNames
  });

  // add the new root properties to the index mapping
  await callCluster('indices.putMapping', {
    index: indexName,
    type: rootEsType,
    body: {
      properties: updatedRootMappings
    },
    update_all_types: true
  });

  // add the updated title field mappings
  await callCluster('indices.putMapping', {
    index: indexName,
    type: rootEsType,
    body: {
      properties: updatedTitleFieldMappings
    },
    update_all_types: true,
  });

  if (missingTitleFieldPropertyNames.length) {
    log(['info', 'elasticsearch'], {
      tmpl: `Running 'updateByQuery' to re-save saved objects to propogate mapping changes for types "<%= names.join('", "') %>"`,
      names: missingTitleFieldPropertyNames
    });

    const bools = missingTitleFieldPropertyNames.map(type => ({ match: { type } }));
    await callCluster('updateByQuery', {
      conflicts: 'proceed',
      index: indexName,
      type: rootEsType,
      body: {
        query: {
          bool: {
            should: bools,
          },
        },
      },
    });
  }
}

/**
 *  Get the mappings dsl for the current Kibana index if it exists
 *  @param  {Function} callCluster
 *  @param  {string} indexName
 *  @param  {string} rootEsType
 *  @return {EsMappingsDsl|undefined}
 */
async function getCurrentMappings(callCluster, indexName, rootEsType) {
  const response = await callCluster('indices.get', {
    index: indexName,
    feature: '_mappings',
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

  const missingPropertyNames = [];
  const updatedMappings = {};

  Object.keys(expectedProps).forEach(prop => {
    if (!existingProps[prop]) {
      missingPropertyNames.push(prop);
      updatedMappings[prop] = expectedProps[prop];
    }
  });

  return {
    missingPropertyNames,
    updatedMappings,
  };
}

async function getMissingUnanalyzedTitleFields(currentMappingsDsl, expectedMappingsDsl) {
  const expectedProps = getRootProperties(expectedMappingsDsl);
  const existingProps = getRootProperties(currentMappingsDsl);

  const missingPropertyNames = [];
  const updatedMappings = {};

  Object.keys(expectedProps).forEach(prop => {
    const expectedFieldProperties = expectedProps[prop] && expectedProps[prop].properties;
    const existingFieldProperties = existingProps[prop] && existingProps[prop].properties;

    if (!expectedFieldProperties && !existingFieldProperties) {
      return;
    }

    const expectedTitleKeyword = get(expectedFieldProperties, 'title.fields.keyword.type');
    const existingTitleKeyword = get(existingFieldProperties, 'title.fields.keyword.type');

    if (expectedTitleKeyword && !existingTitleKeyword) {
      missingPropertyNames.push(prop);
      updatedMappings[`${prop}.title`] = {
        ...existingFieldProperties ? existingFieldProperties.title : {},
        ...expectedFieldProperties.title,
      };
    }
  });

  return {
    missingPropertyNames,
    updatedMappings,
  };
}
