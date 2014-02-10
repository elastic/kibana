define([
  '_',
  './api',
  './api_1_0/aliases',
  './api_1_0/cat',
  './api_1_0/cluster',
  './api_1_0/document',
  './api_1_0/facets',
  './api_1_0/aggregations',
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

  var parts = _(arguments).rest(3);

  function Api_1_0(globalSharedComponentFactories) {
    api.Api.call(this, "api_1_0", globalSharedComponentFactories);
    parts.each(function (apiSection) {
      apiSection(this);
    }, this);
  }

  Api_1_0.prototype = _.create(api.Api.prototype, { 'constructor': Api_1_0  });

  return Api_1_0;

});