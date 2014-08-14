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



// The function is needed because in Elasticsaerch 0.90.x field data is just a string
// but in 1.x it's the first element in an array. So we need a way to access it depending
// on the version.
define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function (item) {
    return _.isArray(item) ? item[0] : item;
  };
});

