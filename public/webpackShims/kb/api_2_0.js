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
  'vendor/_',
  './api',
  './api_2_0/aliases',
  './api_2_0/aggregations',
  './api_2_0/cat',
  './api_2_0/cluster',
  './api_2_0/count',
  './api_2_0/document',
  './api_2_0/filter',
  './api_2_0/nodes',
  './api_2_0/globals',
  './api_2_0/indices',
  './api_2_0/mappings',
  './api_2_0/misc',
  './api_2_0/percolator',
  './api_2_0/query',
  './api_2_0/snapshot_restore',
  './api_2_0/search',
  './api_2_0/settings',
  './api_2_0/templates',
  './api_2_0/warmers'
], function (_, api) {
  'use strict';

  var parts = _(arguments).rest(2);

  function Api_2_0(urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
    api.Api.call(this, "api_2_0", urlParametrizedComponentFactories, bodyParametrizedComponentFactories);
    parts.each(function (apiSection) {
      apiSection(this);
    }, this);
  }

  Api_2_0.prototype = _.create(api.Api.prototype, { 'constructor': Api_2_0  });

  (function (cls) {
    cls.addEndpointDescription = function (endpoint, description) {
      if (description) {
        var url_params_def = {};
        _.each(description.patterns || [], function (p) {
          if (p.indexOf("{indices}") >= 0) {
            url_params_def["ignore_unavailable"] = "__flag__";
            url_params_def["allow_no_indices"] = "__flag__";
            url_params_def["expand_wildcards"] = ["open", "closed"];
          }
        });

        if (url_params_def) {
          description.url_params = description.url_params || {};
          _.defaults(description.url_params, url_params_def);
        }
      }
      Object.getPrototypeOf(cls).addEndpointDescription.call(this, endpoint, description);
    };
  })(Api_2_0.prototype);

  return Api_2_0;

});
