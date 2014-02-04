define([
  '_',
  'exports',
  './api',
  './api_0_90/aliases',
  './api_0_90/cluster',
  './api_0_90/facets',
  './api_0_90/filter',
  './api_0_90/globals',
  './api_0_90/indices',
  './api_0_90/mappings',
  './api_0_90/misc',
  './api_0_90/query',
  './api_0_90/search',
  './api_0_90/settings',
  './api_0_90/templates',
  './api_0_90/warmers'
], function (_, exports, api) {
  'use strict';

  var api_0_90 = new api.Api();

  _(arguments).rest(3).each(function (apiSection) {
    apiSection(api_0_90);
  });

  exports.api = api_0_90;
  return exports;
});