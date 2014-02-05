define([
  '_',
  './api',
  './api_1_0/aliases',
  './api_1_0/cluster',
  './api_1_0/facets',
  './api_1_0/filter',
  './api_1_0/globals',
  './api_1_0/indices',
  './api_1_0/mappings',
  './api_1_0/misc',
  './api_1_0/query',
  './api_1_0/search',
  './api_1_0/settings',
  './api_1_0/templates',
  './api_1_0/warmers'
], function (_, api) {
  'use strict';

  var api_1_0 = new api.Api("api_1_0");


  _(arguments).rest(3).each(function (apiSection) {
    apiSection(api_1_0);
  });

  return api_1_0;
});