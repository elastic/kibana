/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define([
  '_',
  './api',
  './api_0_90/aliases',
  './api_0_90/cluster',
  './api_0_90/count',
  './api_0_90/document',
  './api_0_90/facets',
  './api_0_90/filter',
  './api_0_90/globals',
  './api_0_90/indices',
  './api_0_90/mappings',
  './api_0_90/misc',
  './api_0_90/nodes',
  './api_0_90/query',
  './api_0_90/search',
  './api_0_90/settings',
  './api_0_90/templates',
  './api_0_90/warmers'
], function (_, api) {
  'use strict';

  var parts = _(arguments).rest(2);

  function Api_0_90(urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
    api.Api.call(this, "api_0_90", urlParametrizedComponentFactories, bodyParametrizedComponentFactories);
    parts.each(function (apiSection) {
      apiSection(this);
    }, this);
  }

  Api_0_90.prototype = _.create(api.Api.prototype, { 'constructor': Api_0_90  });

  return Api_0_90;
});