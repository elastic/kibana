define([ '_', 'exports'],
  function (_, exports) {
    'use strict';

    function Api(name) {
      this.global_rules = {};
      this.endpoints = {};
      this.name = name;
    }

    function escapeRegex(text) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    Api.prototype.addGlobalAutocompleteRules = function (parentNode, rules) {
      this.global_rules[parentNode] = rules;
    };

    Api.prototype.getGlobalAutocompleteRules = function () {
      return this.global_rules;
    };

    Api.prototype.addEndpointDescription = function (endpoint, description) {
      if (!description.endpoint_autocomplete) {
        description.endpoint_autocomplete = [endpoint];
      }

      if (!description.match) {
        var l = _.map(description.endpoint_autocomplete, escapeRegex);
        description.match = "(?:" + l.join(")|(?:") + ")";
      }

      if (typeof description.match == "string") {
        description.match = new RegExp(description.match);
      }

      var copiedDescription = {};
      _.extend(copiedDescription, description);
      copiedDescription._id = endpoint;

      this.endpoints[endpoint] = copiedDescription;
    };

    Api.prototype.getEndpointDescriptionByEndpoint = function (endpoint) {
      return this.endpoints[endpoint];
    };

    Api.prototype.getEndpointsForIndicesTypesAndId = function (indices, types, id) {
      var ret = [];
      var index_mode = "none";
      if (indices && indices.length > 0) {
        index_mode = typeof indices == "string" ? "single" : "multi";
      }

      var type_mode = "none";
      if (types && types.length > 0) {
        type_mode = types.length > 1 ? "multi" : "single";
      }
      var id_mode = "none";
      if (id && id.length > 0) {
        id_mode = "single";
      }

      for (var endpoint in this.endpoints) {
        var scheme = this.endpoints[endpoint];
        switch (scheme.indices_mode) {
          case "none":
            if (index_mode !== "none") {
              continue;
            }
            break;
          case "single":
            if (index_mode !== "single") {
              continue;
            }
            break;
          case "required_multi":
            if (index_mode === "none") {
              continue;
            }
            break;
          case "multi": // always good
            break;
        }
        switch (scheme.types_mode) {
          case "none":
            if (type_mode !== "none") {
              continue;
            }
            break;
          case "single":
            if (type_mode !== "single") {
              continue;
            }
            break;
          case "multi": // always good
            break;
        }

        switch (scheme.doc_id_mode) {
          case "none":
            if (id_mode !== "none") {
              continue;
            }
            break;
          case "required_single":
            if (id_mode === "none") {
              continue;
            }
            break;
        }

        ret.push(endpoint);
      }
      return ret;
    };

    Api.prototype.getEndpointDescriptionByPath = function (path, indices, types, id) {
      var endpoints = this.getEndpointsForIndicesTypesAndId(indices, types, id);
      for (var i = 0; i < endpoints.length; i++) {
        var scheme = this.endpoints[endpoints[i]];
        if (scheme.match.test(path || "")) {
          return scheme;
        }
      }
      return null;
    };

    Api.prototype.getEndpointAutocomplete = function (indices, types, id) {
      var ret = [];
      var endpoints = this.getEndpointsForIndicesTypesAndId(indices, types, id);
      for (var i = 0; i < endpoints.length; i++) {
        var scheme = this.endpoints[endpoints[i]];
        ret.push.apply(ret, scheme.endpoint_autocomplete);
      }
      return ret;
    };

    Api.prototype.clear = function () {
      this.endpoints = {};
      this.global_rules = {};
    };

    exports.Api = Api;
    return exports;
  }
);