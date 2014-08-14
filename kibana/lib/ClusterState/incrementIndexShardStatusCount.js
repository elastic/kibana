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



define(function () {
  'use strict';
  return function (status) {
    return function (memo, shard) {

      if (!memo[shard.index]) {
        memo[shard.index] = {};
      }

      if (!memo[shard.index][status]) {
        memo[shard.index][status] = 1;
      } else {
        memo[shard.index][status] += 1;
      }
      return memo;
    };
  };
});
