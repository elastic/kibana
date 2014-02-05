define([
  '_',
  'exports',
  'mappings',
  'es',
  'kb/api',
  'require'
],
  function (_, exports, mappings, es, api, require) {
    'use strict';

    var ACTIVE_API = new api.Api("empty");


    function expandAliases(indices) {
    if (indices && indices.length > 0) {
      indices = mappings.expandAliases(indices);
    }
    return indices;
  }

  function getEndpointDescriptionByEndpoint(endpoint) {
    return ACTIVE_API.getEndpointDescriptionByEndpoint(endpoint)
  }

  function getEndpointsForIndicesTypesAndId(indices, types, id) {
    return ACTIVE_API.getEndpointsForIndicesTypesAndId(expandAliases(indices), types, id);
  }

  function getEndpointDescriptionByPath(path, indices, types, id) {
    return ACTIVE_API.getEndpointDescriptionByPath(path, expandAliases(indices), types, id);
  }

  function getEndpointAutocomplete(indices, types, id) {
    return ACTIVE_API.getEndpointAutocomplete(expandAliases(indices), types, id);
  }

  function getGlobalAutocompleteRules() {
    return ACTIVE_API.getGlobalAutocompleteRules();
  }

  function setActiveApi(api) {
    ACTIVE_API = api;
    console.log("setting api to " + api.name);
  }

  es.addServerChangeListener(function () {
    var version = es.getVersion();
    if (!version || version.length == 0) {
      require(["kb/api_0_90"], setActiveApi);
    }
    else if (version[0] === "1") {
      require(["kb/api_1_0"], setActiveApi);
    }
    else {
      require(["kb/api_0_90"], setActiveApi);
    }
  });

  exports.setActiveApi = setActiveApi;
  exports.getGlobalAutocompleteRules = getGlobalAutocompleteRules;
  exports.getEndpointAutocomplete = getEndpointAutocomplete;
  exports.getEndpointDescriptionByPath = getEndpointDescriptionByPath;
  exports.getEndpointDescriptionByEndpoint = getEndpointDescriptionByEndpoint;
  exports.getEndpointsForIndicesTypesAndId = getEndpointsForIndicesTypesAndId;

  return exports;
});