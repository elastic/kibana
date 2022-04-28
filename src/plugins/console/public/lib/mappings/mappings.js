/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import * as es from '../es/es';

let pollTimeoutId;

let perIndexTypes = {};
let perAliasIndexes = {};
let legacyTemplates = [];
let indexTemplates = [];
let componentTemplates = [];
let dataStreams = [];

export function expandAliases(indicesOrAliases) {
  // takes a list of indices or aliases or a string which may be either and returns a list of indices
  // returns a list for multiple values or a string for a single.

  if (!indicesOrAliases) {
    return indicesOrAliases;
  }

  if (typeof indicesOrAliases === 'string') {
    indicesOrAliases = [indicesOrAliases];
  }

  indicesOrAliases = indicesOrAliases.map((iOrA) => {
    if (perAliasIndexes[iOrA]) {
      return perAliasIndexes[iOrA];
    }
    return [iOrA];
  });
  let ret = [].concat.apply([], indicesOrAliases);
  ret.sort();
  ret = ret.reduce((result, value, index, array) => {
    const last = array[index - 1];
    if (last !== value) {
      result.push(value);
    }
    return result;
  }, []);

  return ret.length > 1 ? ret : ret[0];
}

export function getLegacyTemplates() {
  return [...legacyTemplates];
}

export function getIndexTemplates() {
  return [...indexTemplates];
}

export function getComponentTemplates() {
  return [...componentTemplates];
}

export function getDataStreams() {
  return [...dataStreams];
}

export function getFields(indices, types) {
  // get fields for indices and types. Both can be a list, a string or null (meaning all).
  let ret = [];
  indices = expandAliases(indices);

  if (typeof indices === 'string') {
    const typeDict = perIndexTypes[indices];
    if (!typeDict) {
      return [];
    }

    if (typeof types === 'string') {
      const f = typeDict[types];
      ret = f ? f : [];
    } else {
      // filter what we need
      Object.entries(typeDict).forEach(([type, fields]) => {
        if (!types || types.length === 0 || types.includes(type)) {
          ret.push(fields);
        }
      });

      ret = [].concat.apply([], ret);
    }
  } else {
    // multi index mode.
    Object.keys(perIndexTypes).forEach((index) => {
      if (!indices || indices.length === 0 || indices.includes(index)) {
        ret.push(getFields(index, types));
      }
    });

    ret = [].concat.apply([], ret);
  }

  return _.uniqBy(ret, function (f) {
    return f.name + ':' + f.type;
  });
}

export function getTypes(indices) {
  let ret = [];
  indices = expandAliases(indices);
  if (typeof indices === 'string') {
    const typeDict = perIndexTypes[indices];
    if (!typeDict) {
      return [];
    }

    // filter what we need
    if (Array.isArray(typeDict)) {
      typeDict.forEach((type) => {
        ret.push(type);
      });
    } else if (typeof typeDict === 'object') {
      Object.keys(typeDict).forEach((type) => {
        ret.push(type);
      });
    }
  } else {
    // multi index mode.
    Object.keys(perIndexTypes).forEach((index) => {
      if (!indices || indices.includes(index)) {
        ret.push(getTypes(index));
      }
    });
    ret = [].concat.apply([], ret);
  }

  return _.uniq(ret);
}

export function getIndices(includeAliases) {
  const ret = [];
  Object.keys(perIndexTypes).forEach((index) => {
    // ignore .ds* indices in the suggested indices list.
    if (!index.startsWith('.ds')) {
      ret.push(index);
    }
  });

  if (typeof includeAliases === 'undefined' ? true : includeAliases) {
    Object.keys(perAliasIndexes).forEach((alias) => {
      ret.push(alias);
    });
  }
  return ret;
}

function getFieldNamesFromFieldMapping(fieldName, fieldMapping) {
  if (fieldMapping.enabled === false) {
    return [];
  }
  let nestedFields;

  function applyPathSettings(nestedFieldNames) {
    const pathType = fieldMapping.path || 'full';
    if (pathType === 'full') {
      return nestedFieldNames.map((f) => {
        f.name = fieldName + '.' + f.name;
        return f;
      });
    }
    return nestedFieldNames;
  }

  if (fieldMapping.properties) {
    // derived object type
    nestedFields = getFieldNamesFromProperties(fieldMapping.properties);
    return applyPathSettings(nestedFields);
  }

  const fieldType = fieldMapping.type;

  const ret = { name: fieldName, type: fieldType };

  if (fieldMapping.index_name) {
    ret.name = fieldMapping.index_name;
  }

  if (fieldMapping.fields) {
    nestedFields = Object.entries(fieldMapping.fields).flatMap(([fieldName, fieldMapping]) => {
      return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
    });
    nestedFields = applyPathSettings(nestedFields);
    nestedFields.unshift(ret);
    return nestedFields;
  }

  return [ret];
}

function getFieldNamesFromProperties(properties = {}) {
  const fieldList = Object.entries(properties).flatMap(([fieldName, fieldMapping]) => {
    return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
  });

  // deduping
  return _.uniqBy(fieldList, function (f) {
    return f.name + ':' + f.type;
  });
}

export function loadLegacyTemplates(templatesObject = {}) {
  legacyTemplates = Object.keys(templatesObject);
}

export function loadIndexTemplates(data) {
  indexTemplates = (data.index_templates ?? []).map(({ name }) => name);
}

export function loadComponentTemplates(data) {
  componentTemplates = (data.component_templates ?? []).map(({ name }) => name);
}

export function loadDataStreams(data) {
  dataStreams = (data.data_streams ?? []).map(({ name }) => name);
}

export function loadMappings(mappings) {
  perIndexTypes = {};

  Object.entries(mappings).forEach(([index, indexMapping]) => {
    const normalizedIndexMappings = {};

    // Migrate 1.0.0 mappings. This format has changed, so we need to extract the underlying mapping.
    if (indexMapping.mappings && Object.keys(indexMapping).length === 1) {
      indexMapping = indexMapping.mappings;
    }

    Object.entries(indexMapping).forEach(([typeName, typeMapping]) => {
      if (typeName === 'properties') {
        const fieldList = getFieldNamesFromProperties(typeMapping);
        normalizedIndexMappings[typeName] = fieldList;
      } else {
        normalizedIndexMappings[typeName] = [];
      }
    });
    perIndexTypes[index] = normalizedIndexMappings;
  });
}

export function loadAliases(aliases) {
  perAliasIndexes = {};
  Object.entries(aliases).forEach(([index, omdexAliases]) => {
    // verify we have an index defined. useful when mapping loading is disabled
    perIndexTypes[index] = perIndexTypes[index] || {};

    Object.keys(omdexAliases.aliases || {}).forEach((alias) => {
      if (alias === index) {
        return;
      } // alias which is identical to index means no index.
      let curAliases = perAliasIndexes[alias];
      if (!curAliases) {
        curAliases = [];
        perAliasIndexes[alias] = curAliases;
      }
      curAliases.push(index);
    });
  });

  perAliasIndexes._all = getIndices(false);
}

export function clear() {
  perIndexTypes = {};
  perAliasIndexes = {};
  legacyTemplates = [];
  indexTemplates = [];
  componentTemplates = [];
}

function retrieveSettings(http, settingsKey, settingsToRetrieve) {
  const settingKeyToPathMap = {
    fields: '_mapping',
    indices: '_aliases',
    legacyTemplates: '_template',
    indexTemplates: '_index_template',
    componentTemplates: '_component_template',
    dataStreams: '_data_stream',
  };
  // Fetch autocomplete info if setting is set to true, and if user has made changes.
  if (settingsToRetrieve[settingsKey] === true) {
    // Use pretty=false in these request in order to compress the response by removing whitespace
    const path = `${settingKeyToPathMap[settingsKey]}?pretty=false`;
    const method = 'GET';
    const asSystemRequest = true;
    const withProductOrigin = true;

    return es.send({ http, method, path, asSystemRequest, withProductOrigin });
  } else {
    if (settingsToRetrieve[settingsKey] === false) {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve({});
      // return settingsPromise.resolveWith(this, [{}]);
    } else {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve();
    }
  }
}

// Retrieve all selected settings by default.
// TODO: We should refactor this to be easier to consume. Ideally this function should retrieve
// whatever settings are specified, otherwise just use the saved settings. This requires changing
// the behavior to not *clear* whatever settings have been unselected, but it's hard to tell if
// this is possible without altering the autocomplete behavior. These are the scenarios we need to
// support:
//   1. Manual refresh. Specify what we want. Fetch specified, leave unspecified alone.
//   2. Changed selection and saved: Specify what we want. Fetch changed and selected, leave
//      unchanged alone (both selected and unselected).
//   3. Poll: Use saved. Fetch selected. Ignore unselected.

export function clearSubscriptions() {
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId);
  }
}

const retrieveMappings = async (http, settingsToRetrieve) => {
  const mappings = await retrieveSettings(http, 'fields', settingsToRetrieve);

  if (mappings) {
    const maxMappingSize = Object.keys(mappings).length > 10 * 1024 * 1024;
    let mappingsResponse;
    if (maxMappingSize) {
      console.warn(
        `Mapping size is larger than 10MB (${
          Object.keys(mappings).length / 1024 / 1024
        } MB). Ignoring...`
      );
      mappingsResponse = '{}';
    } else {
      mappingsResponse = mappings;
    }
    loadMappings(mappingsResponse);
  }
};

const retrieveAliases = async (http, settingsToRetrieve) => {
  const aliases = await retrieveSettings(http, 'indices', settingsToRetrieve);

  if (aliases) {
    loadAliases(aliases);
  }
};

const retrieveTemplates = async (http, settingsToRetrieve) => {
  const legacyTemplates = await retrieveSettings(http, 'legacyTemplates', settingsToRetrieve);
  const indexTemplates = await retrieveSettings(http, 'indexTemplates', settingsToRetrieve);
  const componentTemplates = await retrieveSettings(http, 'componentTemplates', settingsToRetrieve);

  if (legacyTemplates) {
    loadLegacyTemplates(legacyTemplates);
  }

  if (indexTemplates) {
    loadIndexTemplates(indexTemplates);
  }

  if (componentTemplates) {
    loadComponentTemplates(componentTemplates);
  }
};

const retrieveDataStreams = async (http, settingsToRetrieve) => {
  const dataStreams = await retrieveSettings(http, 'dataStreams', settingsToRetrieve);

  if (dataStreams) {
    loadDataStreams(dataStreams);
  }
};
/**
 *
 * @param settings Settings A way to retrieve the current settings
 * @param settingsToRetrieve any
 */
export function retrieveAutoCompleteInfo(http, settings, settingsToRetrieve) {
  clearSubscriptions();

  const templatesSettingToRetrieve = {
    ...settingsToRetrieve,
    legacyTemplates: settingsToRetrieve.templates,
    indexTemplates: settingsToRetrieve.templates,
    componentTemplates: settingsToRetrieve.templates,
  };

  Promise.allSettled([
    retrieveMappings(http, settingsToRetrieve),
    retrieveAliases(http, settingsToRetrieve),
    retrieveTemplates(http, templatesSettingToRetrieve),
    retrieveDataStreams(http, settingsToRetrieve),
  ]).then(() => {
    // Schedule next request.
    pollTimeoutId = setTimeout(() => {
      // This looks strange/inefficient, but it ensures correct behavior because we don't want to send
      // a scheduled request if the user turns off polling.
      if (settings.getPolling()) {
        retrieveAutoCompleteInfo(http, settings, settings.getAutocomplete());
      }
    }, settings.getPollInterval());
  });
}
