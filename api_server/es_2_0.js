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



'use strict';

let _ = require("lodash");
let Api = require('./api');
let parts = [
  require('./es_2_0/aliases'),
  require('./es_2_0/aggregations'),
  require('./es_2_0/cat'),
  require('./es_2_0/cluster'),
  require('./es_2_0/count'),
  require('./es_2_0/document'),
  require('./es_2_0/field_stats'),
  require('./es_2_0/filter'),
  require('./es_2_0/nodes'),
  require('./es_2_0/globals'),
  require('./es_2_0/indices'),
  require('./es_2_0/mappings'),
  require('./es_2_0/percolator'),
  require('./es_2_0/query'),
  require('./es_2_0/snapshot_restore'),
  require('./es_2_0/search'),
  require('./es_2_0/settings'),
  require('./es_2_0/templates'),
  require('./es_2_0/warmers')
];

function ES_2_0() {
  Api.call(this, "es_2_0");
  _.each(parts, function (apiSection) {
    apiSection(this);
  }, this);
}

ES_2_0.prototype = _.create(Api.prototype, {'constructor': ES_2_0});

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
})(ES_2_0.prototype);

module.exports = new ES_2_0();
