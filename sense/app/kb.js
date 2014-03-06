define([
  '_',
  'exports',
  'mappings',
  'es',
  'kb/api',
  'autocomplete/engine',
  'require'
],
  function (_, exports, mappings, es, api, autocomplete_engine, require) {
    'use strict';

    var ACTIVE_API = new api.Api("empty");

    function nonValidIndexType(token) {
      return !(token === "_all" || token[0] !== "_");
    }

    function IndexUrlComponent(name, parent, multi_valued) {
      autocomplete_engine.ListComponent.call(this, name, mappings.getIndices, parent, multi_valued);
    }

    IndexUrlComponent.prototype = _.create(
      autocomplete_engine.ListComponent.prototype,
      { 'constructor': IndexUrlComponent  });

    (function (cls) {
      cls.validateToken = function (token) {
        if (!this.multi_valued && token.length > 1) {
          return false;
        }
        return !_.find(token, nonValidIndexType);
      };

      cls.getDefaultTermMeta = function () {
        return "index"
      };

      cls.getContextKey = function () {
        return "indices";
      };
    })(IndexUrlComponent.prototype);


    function TypeGenerator(context) {
      return mappings.getTypes(context.indices);
    }

    function TypeUrlComponent(name, parent, multi_valued) {
      autocomplete_engine.ListComponent.call(this, name, TypeGenerator, parent, multi_valued);
    }

    TypeUrlComponent.prototype = _.create(
      autocomplete_engine.ListComponent.prototype,
      { 'constructor': TypeUrlComponent  });

    (function (cls) {
      cls.validateToken = function (token) {
        if (!this.multi_valued && token.length > 1) {
          return false;
        }

        return !_.find(token, nonValidIndexType);
      };

      cls.getDefaultTermMeta = function () {
        return "type"
      };

      cls.getContextKey = function () {
        return "types";
      };
    })(TypeUrlComponent.prototype);

    function FieldGenerator(context) {
      return mappings.getFields(context.indices, context.types);
    }

    function FieldUrlComponent(name, parent, multi_valued) {
      autocomplete_engine.ListComponent.call(this, name, FieldGenerator, parent, multi_valued);
    }

    FieldUrlComponent.prototype = _.create(
      autocomplete_engine.ListComponent.prototype,
      { 'constructor': FieldUrlComponent  });

    (function (cls) {
      cls.validateToken = function (token) {
        if (!this.multi_valued && token.length > 1) {
          return false;
        }

        return !_.find(token, function (t) {
          return t.match(/[^\w.?*]/);
        });
      };

      cls.getDefaultTermMeta = function () {
        return "field"
      };

      cls.getContextKey = function () {
        return "fields";
      };
    })(FieldUrlComponent.prototype);


    function IdUrlComponent(name, parent) {
      autocomplete_engine.SharedComponent.call(this, name, parent);
    }

    IdUrlComponent.prototype = _.create(
      autocomplete_engine.SharedComponent.prototype,
      { 'constructor': IdUrlComponent  });

    (function (cls) {
      cls.match = function (token, context, editor) {
        if (_.isArray(token) || !token) {
          return null;
        }
        if (token.match(/[\/,]/)) {
          return null;
        }
        var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
        r.context_values = r.context_values || {};
        r.context_values['id'] = token;
        return r;
      };
    })(IdUrlComponent.prototype);

    var globalUrlComponentFactories = {

      'index': function (part, parent, endpoint) {
        return new IndexUrlComponent(part, parent, false);
      },
      'indices': function (part, parent, endpoint) {
        return new IndexUrlComponent(part, parent, true);
      },
      'type': function (part, parent, endpoint) {
        return new TypeUrlComponent(part, parent, false);
      },
      'types': function (part, parent, endpoint) {
        return new TypeUrlComponent(part, parent, true);
      },
      'id': function (part, parent, endpoint) {
        return new IdUrlComponent(part, parent);
      },
      'fields': function (part, parent, endpoint) {
        return new FieldUrlComponent(part, parent, true);
      },
      'nodes': function (part, parent, endpoint) {
        return new autocomplete_engine.ListComponent(part, ["_local", "_master", "data:true", "data:false",
          "master:true", "master:false"], parent)
      }
    };


    function expandAliases(indices) {
      if (indices && indices.length > 0) {
        indices = mappings.expandAliases(indices);
      }
      return indices;
    }

    function getEndpointDescriptionByEndpoint(endpoint) {
      return ACTIVE_API.getEndpointDescriptionByEndpoint(endpoint)
    }

    function getTopLevelUrlCompleteComponents() {
      return ACTIVE_API.getTopLevelUrlCompleteComponents();
    }

    function getGlobalAutocompleteRules() {
      return ACTIVE_API.getGlobalAutocompleteRules();
    }

    function setActiveApi(api) {
      if (_.isString(api)) {
        require([api], setActiveApi);
        return;
      }
      if (_.isFunction(api)) {
        /* jshint -W055 */
        setActiveApi(new api(globalUrlComponentFactories));
        return;
      }
      ACTIVE_API = api;
      console.log("setting api to " + api.name);
    }

    es.addServerChangeListener(function () {
      var version = es.getVersion(), api;
      if (!version || version.length == 0) {
        api = "kb/api_1_0";
      }
      else if (version[0] === "1") {
        api = "kb/api_1_0";
      }
      else if (version[0] === "2") {
        api = "kb/api_1_0";
      }
      else {
        api = "kb/api_0_90";
      }

      if (api) {
        setActiveApi(api);
      }

    });

    exports.setActiveApi = setActiveApi;
    exports.getGlobalAutocompleteRules = getGlobalAutocompleteRules;
    exports.getEndpointDescriptionByEndpoint = getEndpointDescriptionByEndpoint;
    exports.getTopLevelUrlCompleteComponents = getTopLevelUrlCompleteComponents;

    exports._test = {
      globalUrlComponentFactories: globalUrlComponentFactories
    };

    return exports;
  });