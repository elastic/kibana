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

const $ = require('jquery');
const _ = require('lodash');
const es = require('./es');
const settings = require('./settings');



let perIndexTypes = {};
let perAliasIndexes = [];
let templates = [];

const mappingObj = {};

function expandAliases(indicesOrAliases) {
  // takes a list of indices or aliases or a string which may be either and returns a list of indices
  // returns a list for multiple values or a string for a single.

  if (!indicesOrAliases) {
    return indicesOrAliases;
  }

  if (typeof indicesOrAliases === 'string') {
    indicesOrAliases = [indicesOrAliases];
  }
  indicesOrAliases = $.map(indicesOrAliases, function (iOrA) {
    if (perAliasIndexes[iOrA]) {
      return perAliasIndexes[iOrA];
    }
    return [iOrA];
  });
  let ret = [].concat.apply([], indicesOrAliases);
  ret.sort();
  let last;
  ret = $.map(ret, function (v) {
    const r = last === v ? null : v;
    last = v;
    return r;
  });
  return ret.length > 1 ? ret : ret[0];
}

function getTemplates() {
  return [ ...templates ];
}
function getFields(indices, types) {
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
    }
    else {
      // filter what we need
      $.each(typeDict, function (type, fields) {
        if (!types || types.length === 0 || $.inArray(type, types) !== -1) {
          ret.push(fields);
        }
      });

      ret = [].concat.apply([], ret);
    }
  }
  else {
    // multi index mode.
    $.each(perIndexTypes, function (index) {
      if (!indices || indices.length === 0 || $.inArray(index, indices) !== -1) {
        ret.push(getFields(index, types));
      }
    });
    ret = [].concat.apply([], ret);
  }

  return _.uniq(ret, function (f) {
    return f.name + ':' + f.type;
  });
}

function getTypes(indices) {
  let ret = [];
  indices = expandAliases(indices);
  if (typeof indices === 'string') {
    const typeDict = perIndexTypes[indices];
    if (!typeDict) {
      return [];
    }

    // filter what we need
    $.each(typeDict, function (type) {
      ret.push(type);
    });

  }
  else {
    // multi index mode.
    $.each(perIndexTypes, function (index) {
      if (!indices || $.inArray(index, indices) !== -1) {
        ret.push(getTypes(index));
      }
    });
    ret = [].concat.apply([], ret);
  }

  return _.uniq(ret);

}


function getIndices(includeAliases) {
  const ret = [];
  $.each(perIndexTypes, function (index) {
    ret.push(index);
  });
  if (typeof includeAliases === 'undefined' ? true : includeAliases) {
    $.each(perAliasIndexes, function (alias) {
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
      return $.map(nestedFieldNames, function (f) {
        f.name = fieldName + '.' + f.name;
        return f;
      });
    }
    return nestedFieldNames;
  }

  if (fieldMapping.properties) {
    // derived object type
    nestedFields = getFieldNamesFromTypeMapping(fieldMapping);
    return applyPathSettings(nestedFields);
  }

  const fieldType = fieldMapping.type;

  if (fieldType === 'multi_field') {
    nestedFields = $.map(fieldMapping.fields, function (fieldMapping, fieldName) {
      return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
    });

    return applyPathSettings(nestedFields);
  }

  const ret = { name: fieldName, type: fieldType };

  if (fieldMapping.index_name) {
    ret.name = fieldMapping.index_name;
  }

  if (fieldMapping.fields) {
    nestedFields = $.map(fieldMapping.fields, function (fieldMapping, fieldName) {
      return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
    });
    nestedFields = applyPathSettings(nestedFields);
    nestedFields.unshift(ret);
    return nestedFields;
  }

  return [ret];
}

function getFieldNamesFromTypeMapping(typeMapping) {
  const fieldList =
    $.map(typeMapping.properties || {}, function (fieldMapping, fieldName) {
      return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
    });

  // deduping
  return _.uniq(fieldList, function (f) {
    return f.name + ':' + f.type;
  });
}

function loadTemplates(templatesObject = {}) {
  templates = Object.keys(templatesObject);
}

function loadMappings(mappings) {
  perIndexTypes = {};
  $.each(mappings, function (index, indexMapping) {
    const normalizedIndexMappings = {};
    // 1.0.0 mapping format has changed, extract underlying mapping
    if (indexMapping.mappings && _.keys(indexMapping).length === 1) {
      indexMapping = indexMapping.mappings;
    }
    $.each(indexMapping, function (typeName, typeMapping) {
      const fieldList = getFieldNamesFromTypeMapping(typeMapping);
      normalizedIndexMappings[typeName] = fieldList;
    });
    perIndexTypes[index] = normalizedIndexMappings;
  });
}

function loadAliases(aliases) {
  perAliasIndexes = {};
  $.each(aliases || {}, function (index, omdexAliases) {
    // verify we have an index defined. useful when mapping loading is disabled
    perIndexTypes[index] = perIndexTypes[index] || {};

    $.each(omdexAliases.aliases || {}, function (alias) {
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

function clear() {
  perIndexTypes = {};
  perAliasIndexes = {};
  templates = [];
}

function retrieveSettings(settingsKey, changedFields) {
  const autocompleteSettings = settings.getAutocomplete();
  const settingKeyToPathMap = {
    fields: '_mapping',
    indices: '_aliases',
    templates: '_template',
  };
  // Fetch autocomplete info if setting is set to true, and if user has made changes
  if (autocompleteSettings[settingsKey] && changedFields[settingsKey]) {
    return es.send('GET', settingKeyToPathMap[settingsKey], null, null, true);
  } else {
    const settingsPromise = new $.Deferred();
    // If a user has saved settings, but a field remains checked and unchanged, no need to make changes
    if (autocompleteSettings[settingsKey]) {
      return settingsPromise.resolve();
    }
    // If the user doesn't want autocomplete suggestions, then clear any that exist
    return settingsPromise.resolveWith(this, [ [JSON.stringify({})] ]);
  }
}

function retrieveAutocompleteInfoFromServer(changedFields) {
  const mappingPromise = retrieveSettings('fields', changedFields);
  const aliasesPromise = retrieveSettings('indices', changedFields);
  const templatesPromise = retrieveSettings('templates', changedFields);

  $.when(mappingPromise, aliasesPromise, templatesPromise)
    .done((mappings, aliases, templates) => {
      let mappingsResponse;
      if (mappings) {
        const maxMappingSize = mappings[0].length > 10 * 1024 * 1024;
        if (maxMappingSize) {
          console.warn(`Mapping size is larger than 10MB (${mappings[0].length / 1024 / 1024} MB). Ignoring...`);
          mappingsResponse = '[{}]';
        } else {
          mappingsResponse = mappings[0];
        }
        loadMappings(JSON.parse(mappingsResponse));
      }

      if (aliases) {
        loadAliases(JSON.parse(aliases[0]));
      }

      if (templates) {
        loadTemplates(JSON.parse(templates[0]));
      }

      if (mappings && aliases) {
        // Trigger an update event with the mappings, aliases
        $(mappingObj).trigger('update', [mappingsResponse, aliases[0]]);
      }
    });
}

function autocompleteRetriever() {
  const changedFields = settings.getAutocomplete();
  retrieveAutocompleteInfoFromServer(changedFields);
  setTimeout(function () {
    autocompleteRetriever();
  }, 60000);
}

export default _.assign(mappingObj, {
  getFields: getFields,
  getTemplates: getTemplates,
  getIndices: getIndices,
  getTypes: getTypes,
  loadMappings: loadMappings,
  loadAliases: loadAliases,
  expandAliases: expandAliases,
  clear: clear,
  startRetrievingAutoCompleteInfo: autocompleteRetriever,
  retrieveAutoCompleteInfo: retrieveAutocompleteInfoFromServer
});
