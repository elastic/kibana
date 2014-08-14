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
  var moment = require('moment');
  return function (kbnIndex, dashboard) {
    var to = moment.utc();
    var from = moment.utc().subtract(dashboard.current.index.interval, 3);
    var interval = dashboard.current.index.interval;
    var pattern = dashboard.current.index.pattern;
    return kbnIndex.indices(from, to, pattern, interval);
  };  
});
