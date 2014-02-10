define([
  '_',
  './api',
  './api_0_90/aliases',
  './api_0_90/cluster',
  './api_0_90/document',
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
], function (_, api) {
  'use strict';

  var parts = _(arguments).rest(3);

  function Api_0_90(globalSharedComponentFactories) {
    api.Api.call(this, "api_0_90", globalSharedComponentFactories);
    parts.each(function (apiSection) {
      apiSection(this);
    }, this);
  }

  Api_0_90.prototype = _.create(api.Api.prototype, { 'constructor': Api_0_90  });

  return Api_0_90;
});