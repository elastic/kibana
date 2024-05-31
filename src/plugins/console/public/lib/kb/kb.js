/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { API_BASE_PATH } from '../../../common/constants';

import {
  IndexAutocompleteComponent,
  FieldAutocompleteComponent,
  ListComponent,
  LegacyTemplateAutocompleteComponent,
  IndexTemplateAutocompleteComponent,
  ComponentTemplateAutocompleteComponent,
  DataStreamAutocompleteComponent,
} from '../autocomplete/components';

import _ from 'lodash';

import Api from './api';

let ACTIVE_API = new Api();
let apiLoaded = false;
const isNotAnIndexName = (name) => name[0] === '_' && name !== '_all';

const parametrizedComponentFactories = {
  getComponent: function (name, parent, provideDefault) {
    if (this[name]) {
      return this[name];
    } else if (provideDefault) {
      return new ListComponent(name, [], parent, false);
    }
  },
  index: function (name, parent) {
    if (isNotAnIndexName(name)) return;
    return new IndexAutocompleteComponent(name, parent, true);
  },
  fields: function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, true);
  },
  field: function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, false);
  },
  // legacy index templates
  template: function (name, parent) {
    return new LegacyTemplateAutocompleteComponent(name, parent);
  },
  // composable index templates
  // currently seems to be unused, but that is a useful functionality
  index_template: function (name, parent) {
    return new IndexTemplateAutocompleteComponent(name, parent);
  },
  // currently seems to be unused, but that is a useful functionality
  component_template: function (name, parent) {
    return new ComponentTemplateAutocompleteComponent(name, parent);
  },
  // currently seems to be unused, but that is a useful functionality
  data_stream: function (name, parent) {
    return new DataStreamAutocompleteComponent(name, parent);
  },
};

export function getUnmatchedEndpointComponents() {
  return ACTIVE_API.getUnmatchedEndpointComponents();
}

export function getEndpointDescriptionByEndpoint(endpoint) {
  return ACTIVE_API.getEndpointDescriptionByEndpoint(endpoint);
}

export function getEndpointBodyCompleteComponents(endpoint) {
  const desc = getEndpointDescriptionByEndpoint(endpoint);
  if (!desc) {
    throw new Error("failed to resolve endpoint ['" + endpoint + "']");
  }
  return desc.bodyAutocompleteRootComponents;
}

export function getTopLevelUrlCompleteComponents(method) {
  return ACTIVE_API.getTopLevelUrlCompleteComponents(method);
}

export function getGlobalAutocompleteComponents(term, throwOnMissing) {
  return ACTIVE_API.getGlobalAutocompleteComponents(term, throwOnMissing);
}

function loadApisFromJson(
  json,
  urlParametrizedComponentFactories,
  bodyParametrizedComponentFactories
) {
  try {
    urlParametrizedComponentFactories =
      urlParametrizedComponentFactories || parametrizedComponentFactories;
    bodyParametrizedComponentFactories =
      bodyParametrizedComponentFactories || urlParametrizedComponentFactories;
    const api = new Api(urlParametrizedComponentFactories, bodyParametrizedComponentFactories);
    const names = [];
    _.each(json, function (apiJson, name) {
      names.unshift(name);
      _.each(apiJson.globals || {}, function (globalJson, globalName) {
        api.addGlobalAutocompleteRules(globalName, globalJson);
      });
      _.each(apiJson.endpoints || {}, function (endpointJson, endpointName) {
        api.addEndpointDescription(endpointName, endpointJson);
      });
    });
    api.name = names.join(',');
    return api;
  } catch (e) {
    console.error(e);
  }
}

function setActiveApi(api) {
  if (!api) {
    return;
  }

  ACTIVE_API = api;
}

export async function loadActiveApi(http) {
  // Only load the API data once
  if (apiLoaded) return;
  apiLoaded = true;

  try {
    const data = await http.get(`${API_BASE_PATH}/api_server`);
    setActiveApi(loadApisFromJson(data));
  } catch (err) {
    console.log(`failed to load API: ${err.responseText}`);
    // If we fail to load the API, clear this flag so it can be retried
    apiLoaded = false;
  }
}

export const _test = {
  loadApisFromJson: loadApisFromJson,
  setActiveApi: setActiveApi,
};
