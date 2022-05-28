/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  TypeAutocompleteComponent,
  IdAutocompleteComponent,
  IndexAutocompleteComponent,
  FieldAutocompleteComponent,
  ListComponent,
  LegacyTemplateAutocompleteComponent,
  UsernameAutocompleteComponent,
  IndexTemplateAutocompleteComponent,
  ComponentTemplateAutocompleteComponent,
  DataStreamAutocompleteComponent,
} from '../autocomplete/components';

import $ from 'jquery';
import _ from 'lodash';

import Api from './api';

let ACTIVE_API = new Api();
const isNotAnIndexName = (name) => name[0] === '_' && name !== '_all';

const idAutocompleteComponentFactory = (name, parent) => {
  return new IdAutocompleteComponent(name, parent);
};
const parametrizedComponentFactories = {
  getComponent: function (name, parent, provideDefault) {
    if (this[name]) {
      return this[name];
    } else if (provideDefault) {
      return idAutocompleteComponentFactory;
    }
  },
  index: function (name, parent) {
    if (isNotAnIndexName(name)) return;
    return new IndexAutocompleteComponent(name, parent, false);
  },
  indices: function (name, parent) {
    if (isNotAnIndexName(name)) return;
    return new IndexAutocompleteComponent(name, parent, true);
  },
  type: function (name, parent) {
    return new TypeAutocompleteComponent(name, parent, false);
  },
  types: function (name, parent) {
    return new TypeAutocompleteComponent(name, parent, true);
  },
  id: function (name, parent) {
    return idAutocompleteComponentFactory(name, parent);
  },
  transform_id: function (name, parent) {
    return idAutocompleteComponentFactory(name, parent);
  },
  username: function (name, parent) {
    return new UsernameAutocompleteComponent(name, parent);
  },
  user: function (name, parent) {
    return new UsernameAutocompleteComponent(name, parent);
  },
  template: function (name, parent) {
    return new LegacyTemplateAutocompleteComponent(name, parent);
  },
  task_id: function (name, parent) {
    return idAutocompleteComponentFactory(name, parent);
  },
  ids: function (name, parent) {
    return idAutocompleteComponentFactory(name, parent, true);
  },
  fields: function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, true);
  },
  field: function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, false);
  },
  nodes: function (name, parent) {
    return new ListComponent(
      name,
      ['_local', '_master', 'data:true', 'data:false', 'master:true', 'master:false'],
      parent
    );
  },
  node: function (name, parent) {
    return new ListComponent(name, [], parent, false);
  },
  index_template: function (name, parent) {
    return new IndexTemplateAutocompleteComponent(name, parent);
  },
  component_template: function (name, parent) {
    return new ComponentTemplateAutocompleteComponent(name, parent);
  },
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
}

// TODO: clean up setting up of active API and use of jQuery.
// This function should be attached to a class that holds the current state, not setup
// when the file is required. Also, jQuery should not be used to make network requests
// like this, it looks like a minor security issue.
export function setActiveApi(api) {
  if (!api) {
    $.ajax({
      url: '../api/console/api_server',
      dataType: 'json', // disable automatic guessing
      headers: {
        'kbn-xsrf': 'kibana',
      },
    }).then(
      function (data) {
        setActiveApi(loadApisFromJson(data));
      },
      function (jqXHR) {
        console.log("failed to load API '" + api + "': " + jqXHR.responseText);
      }
    );
    return;
  }

  ACTIVE_API = api;
}

setActiveApi();

export const _test = {
  loadApisFromJson: loadApisFromJson,
};
