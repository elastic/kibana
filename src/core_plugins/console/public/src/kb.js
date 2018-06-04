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
const mappings = require('./mappings');
const Api = require('./kb/api');
const autocompleteEngine = require('./autocomplete/engine');

let ACTIVE_API = new Api();

function nonValidIndexType(token) {
  return !(token === '_all' || token[0] !== '_');
}

function IndexAutocompleteComponent(name, parent, multiValued) {
  autocompleteEngine.ListComponent.call(this, name, mappings.getIndices, parent, multiValued);
}

IndexAutocompleteComponent.prototype = _.create(
  autocompleteEngine.ListComponent.prototype,
  { 'constructor': IndexAutocompleteComponent });

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }
    return !_.find(tokens, nonValidIndexType);
  };

  cls.getDefaultTermMeta = function () {
    return 'index';
  };

  cls.getContextKey = function () {
    return 'indices';
  };
}(IndexAutocompleteComponent.prototype));


function TypeGenerator(context) {
  return mappings.getTypes(context.indices);
}

function TypeAutocompleteComponent(name, parent, multiValued) {
  autocompleteEngine.ListComponent.call(this, name, TypeGenerator, parent, multiValued);
}

TypeAutocompleteComponent.prototype = _.create(
  autocompleteEngine.ListComponent.prototype,
  { 'constructor': TypeAutocompleteComponent });

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, nonValidIndexType);
  };

  cls.getDefaultTermMeta = function () {
    return 'type';
  };

  cls.getContextKey = function () {
    return 'types';
  };
}(TypeAutocompleteComponent.prototype));

function FieldGenerator(context) {
  return _.map(mappings.getFields(context.indices, context.types), function (field) {
    return { name: field.name, meta: field.type };
  });
}

function FieldAutocompleteComponent(name, parent, multiValued) {
  autocompleteEngine.ListComponent.call(this, name, FieldGenerator, parent, multiValued);
}

FieldAutocompleteComponent.prototype = _.create(
  autocompleteEngine.ListComponent.prototype,
  { 'constructor': FieldAutocompleteComponent });

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, function (token) {
      return token.match(/[^\w.?*]/);
    });
  };

  cls.getDefaultTermMeta = function () {
    return 'field';
  };

  cls.getContextKey = function () {
    return 'fields';
  };
}(FieldAutocompleteComponent.prototype));


function IdAutocompleteComponent(name, parent, multi) {
  autocompleteEngine.SharedComponent.call(this, name, parent);
  this.multi_match = multi;
}

IdAutocompleteComponent.prototype = _.create(
  autocompleteEngine.SharedComponent.prototype,
  { 'constructor': IdAutocompleteComponent });

(function (cls) {
  cls.match = function (token, context, editor) {
    if (!token) {
      return null;
    }
    if (!this.multi_match && Array.isArray(token)) {
      return null;
    }
    token = Array.isArray(token) ? token : [token];
    if (_.find(token, function (t) {
      return t.match(/[\/,]/);
    })) {
      return null;
    }
    const r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values.id = token;
    return r;
  };
}(IdAutocompleteComponent.prototype));

const parametrizedComponentFactories = {

  'index': function (name, parent) {
    return new IndexAutocompleteComponent(name, parent, false);
  },
  'indices': function (name, parent) {
    return new IndexAutocompleteComponent(name, parent, true);
  },
  'type': function (name, parent) {
    return new TypeAutocompleteComponent(name, parent, false);
  },
  'types': function (name, parent) {
    return new TypeAutocompleteComponent(name, parent, true);
  },
  'id': function (name, parent) {
    return new IdAutocompleteComponent(name, parent);
  },
  'ids': function (name, parent) {
    return new IdAutocompleteComponent(name, parent, true);
  },
  'fields': function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, true);
  },
  'field': function (name, parent) {
    return new FieldAutocompleteComponent(name, parent, false);
  },
  'nodes': function (name, parent) {
    return new autocompleteEngine.ListComponent(name, ['_local', '_master', 'data:true', 'data:false',
      'master:true', 'master:false'], parent);
  },
  'node': function (name, parent) {
    return new autocompleteEngine.ListComponent(name, [], parent, false);
  }
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
    throw new Error('failed to resolve endpoint [\'' + endpoint + '\']');
  }
  return desc.bodyAutocompleteRootComponents;
}

export function getTopLevelUrlCompleteComponents() {
  return ACTIVE_API.getTopLevelUrlCompleteComponents();
}

export function getGlobalAutocompleteComponents(term, throwOnMissing) {
  return ACTIVE_API.getGlobalAutocompleteComponents(term, throwOnMissing);
}

function loadApisFromJson(json, urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
  urlParametrizedComponentFactories = urlParametrizedComponentFactories || parametrizedComponentFactories;
  bodyParametrizedComponentFactories = bodyParametrizedComponentFactories || urlParametrizedComponentFactories;
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

export function setActiveApi(api) {
  if (_.isString(api)) {
    $.ajax({
      url: '../api/console/api_server?sense_version=' + encodeURIComponent('@@SENSE_VERSION') + '&apis=' + encodeURIComponent(api),
      dataType: 'json', // disable automatic guessing
    }
    ).then(
      function (data) {
        setActiveApi(loadApisFromJson(data));
      },
      function (jqXHR) {
        console.log('failed to load API \'' + api + '\': ' + jqXHR.responseText);
      });
    return;

  }
  console.log('setting active api to [' + api.name + ']');

  ACTIVE_API = api;
}

setActiveApi('es_6_0');

export const _test = {
  loadApisFromJson: loadApisFromJson
};
