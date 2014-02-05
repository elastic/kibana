define([
  '_',
  'exports',
  'mappings',
  'kb/api_0_90'
], function (_, exports, mappings, api_0_90) {
  'use strict';

  var ACTIVE_API = api_0_90.api;


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
  }

  exports.setActiveApi = setActiveApi;
  exports.getGlobalAutocompleteRules = getGlobalAutocompleteRules;
  exports.getEndpointAutocomplete = getEndpointAutocomplete;
  exports.getEndpointDescriptionByPath = getEndpointDescriptionByPath;
  exports.getEndpointDescriptionByEndpoint = getEndpointDescriptionByEndpoint;
  exports.getEndpointsForIndicesTypesAndId = getEndpointsForIndicesTypesAndId;

  return exports;
});