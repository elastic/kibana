let $ = require('jquery');
let _ = require('lodash');
let mappings = require('./mappings');
let es = require('./es');
let Api = require('./kb/api');
let autocomplete_engine = require('./autocomplete/engine');

var ACTIVE_API = new Api();

function nonValidIndexType(token) {
  return !(token === "_all" || token[0] !== "_");
}

function IndexAutocompleteComponent(name, parent, multi_valued) {
  autocomplete_engine.ListComponent.call(this, name, mappings.getIndices, parent, multi_valued);
}

IndexAutocompleteComponent.prototype = _.create(
  autocomplete_engine.ListComponent.prototype,
  {'constructor': IndexAutocompleteComponent});

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multi_valued && tokens.length > 1) {
      return false;
    }
    return !_.find(tokens, nonValidIndexType);
  };

  cls.getDefaultTermMeta = function () {
    return "index"
  };

  cls.getContextKey = function () {
    return "indices";
  };
})(IndexAutocompleteComponent.prototype);


function TypeGenerator(context) {
  return mappings.getTypes(context.indices);
}

function TypeAutocompleteComponent(name, parent, multi_valued) {
  autocomplete_engine.ListComponent.call(this, name, TypeGenerator, parent, multi_valued);
}

TypeAutocompleteComponent.prototype = _.create(
  autocomplete_engine.ListComponent.prototype,
  {'constructor': TypeAutocompleteComponent});

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multi_valued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, nonValidIndexType);
  };

  cls.getDefaultTermMeta = function () {
    return "type"
  };

  cls.getContextKey = function () {
    return "types";
  };
})(TypeAutocompleteComponent.prototype);

function FieldGenerator(context) {
  return _.map(mappings.getFields(context.indices, context.types), function (field) {
    return {name: field.name, meta: field.type};
  });
}

function FieldAutocompleteComponent(name, parent, multi_valued) {
  autocomplete_engine.ListComponent.call(this, name, FieldGenerator, parent, multi_valued);
}

FieldAutocompleteComponent.prototype = _.create(
  autocomplete_engine.ListComponent.prototype,
  {'constructor': FieldAutocompleteComponent});

(function (cls) {
  cls.validateTokens = function (tokens) {
    if (!this.multi_valued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, function (token) {
      return token.match(/[^\w.?*]/);
    });
  };

  cls.getDefaultTermMeta = function () {
    return "field"
  };

  cls.getContextKey = function () {
    return "fields";
  };
})(FieldAutocompleteComponent.prototype);


function IdAutocompleteComponent(name, parent, multi) {
  autocomplete_engine.SharedComponent.call(this, name, parent);
  this.multi_match = multi
}

IdAutocompleteComponent.prototype = _.create(
  autocomplete_engine.SharedComponent.prototype,
  {'constructor': IdAutocompleteComponent});

(function (cls) {
  cls.match = function (token, context, editor) {
    if (!token) {
      return null;
    }
    if (!this.multi_match && _.isArray(token)) {
      return null;
    }
    token = _.isArray(token) ? token : [token];
    if (_.find(token, function (t) {
        return t.match(/[\/,]/);
      })) {
      return null;
    }
    var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values['id'] = token;
    return r;
  };
})(IdAutocompleteComponent.prototype);

var parametrizedComponentFactories = {

  'index': function (name, parent, endpoint) {
    return new IndexAutocompleteComponent(name, parent, false);
  },
  'indices': function (name, parent, endpoint) {
    return new IndexAutocompleteComponent(name, parent, true);
  },
  'type': function (name, parent, endpoint) {
    return new TypeAutocompleteComponent(name, parent, false);
  },
  'types': function (name, parent, endpoint) {
    return new TypeAutocompleteComponent(name, parent, true);
  },
  'id': function (name, parent, endpoint) {
    return new IdAutocompleteComponent(name, parent);
  },
  'ids': function (name, parent, endpoint) {
    return new IdAutocompleteComponent(name, parent, true);
  },
  'fields': function (name, parent, endpoint) {
    return new FieldAutocompleteComponent(name, parent, true);
  },
  'field': function (name, parent, endpoint) {
    return new FieldAutocompleteComponent(name, parent, false);
  },
  'nodes': function (name, parent, endpoint) {
    return new autocomplete_engine.ListComponent(name, ["_local", "_master", "data:true", "data:false",
      "master:true", "master:false"], parent)
  },
  'node': function (name, parent, endpoint) {
    return new autocomplete_engine.ListComponent(name, [], parent, false)
  }
};


function expandAliases(indices) {
  if (indices && indices.length > 0) {
    indices = mappings.expandAliases(indices);
  }
  return indices;
}

function getUnmatchedEndpointComponents() {
  return ACTIVE_API.getUnmatchedEndpointComponents();
}

function getEndpointDescriptionByEndpoint(endpoint) {
  return ACTIVE_API.getEndpointDescriptionByEndpoint(endpoint)
}

function getEndpointBodyCompleteComponents(endpoint) {
  var desc = getEndpointDescriptionByEndpoint(endpoint);
  if (!desc) {
    throw new Error("failed to resolve endpoint ['" + endpoint + "']");
  }
  return desc.bodyAutocompleteRootComponents;
}

function getTopLevelUrlCompleteComponents() {
  return ACTIVE_API.getTopLevelUrlCompleteComponents();
}

function getGlobalAutocompleteComponents(term, throwOnMissing) {
  return ACTIVE_API.getGlobalAutocompleteComponents(term, throwOnMissing);
}

function loadApisFromJson(json, urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
  urlParametrizedComponentFactories = urlParametrizedComponentFactories || parametrizedComponentFactories;
  bodyParametrizedComponentFactories = bodyParametrizedComponentFactories || urlParametrizedComponentFactories;
  let api = new Api(urlParametrizedComponentFactories, bodyParametrizedComponentFactories);
  let names = [];
  _.each(json, function (apiJson, name) {
    names.unshift(name);
    _.each(apiJson.globals || {}, function (globalJson, globalName) {
      api.addGlobalAutocompleteRules(globalName, globalJson);
    });
    _.each(apiJson.endpoints || {}, function (endpointJson, endpointName) {
      api.addEndpointDescription(endpointName, endpointJson);
    });
  });
  api.name = names.join(",");
  return api;
}

function setActiveApi(api) {
  if (_.isString(api)) {
    $.ajax({
        url: '../api/console/api_server?sense_version=' + encodeURIComponent('@@SENSE_VERSION') + "&apis=" + encodeURIComponent(api),
        dataType: "json", // disable automatic guessing
      }
    ).then(
      function (data, textStatus, jqXHR) {
        setActiveApi(loadApisFromJson(data));
      },
      function (jqXHR) {
        console.log("failed to load API '" + api + "': " + jqXHR.responseText);
      });
    return;

  }
  console.log("setting active api to [" + api.name + "]");

  ACTIVE_API = api;
}

setActiveApi('es_5_0');

module.exports.setActiveApi = setActiveApi;
module.exports.getGlobalAutocompleteComponents = getGlobalAutocompleteComponents;
module.exports.getEndpointDescriptionByEndpoint = getEndpointDescriptionByEndpoint;
module.exports.getEndpointBodyCompleteComponents = getEndpointBodyCompleteComponents;
module.exports.getTopLevelUrlCompleteComponents = getTopLevelUrlCompleteComponents;
module.exports.getUnmatchedEndpointComponents = getUnmatchedEndpointComponents;

module.exports._test = {
  loadApisFromJson: loadApisFromJson
};
