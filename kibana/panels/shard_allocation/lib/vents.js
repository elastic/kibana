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



define(function (require) {
  'use strict';
  var _ = require('lodash');
  var vents = {};
  return {
    vents: vents,
    on: function (id, cb) {
      if (!_.isArray(vents[id])) {
        vents[id] = [];
      }
      vents[id].push(cb);
    }, 
    clear: function (id) {
      delete vents[id];
    },
    trigger: function () {
      var args = Array.prototype.slice.call(arguments);
      var id = args.shift();
      if (vents[id]) {
        _.each(vents[id], function (cb) {
          cb.apply(null, args);
        });
      }
    }
  };
});
