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
  var filterShards = require('./filterShards');
  var incrementIndexShardStatusCount = require('./incrementIndexShardStatusCount');
  var extractShards = require('lib/extractShards');

  /**
     ignoreIndices is an object who's keys are index names that should be ignored.
     this is done for lookup performance
   */
  var checkFor = function (shards, plan, status, state, ignoreIndices) {
    var primary = (status === 'red');
    ignoreIndices = ignoreIndices || {};
    return _.chain(shards)
      .filter(function (shard) {
        return _.isUndefined(ignoreIndices[shard.index]);
      })
      .filter(filterShards(state.toUpperCase(), primary))
      .reduce(incrementIndexShardStatusCount(state.toLowerCase()), plan[status])
      .value();
  };

  return function (service) {
    var shards = extractShards(service.state);
    var plan = { red: {}, yellow: {}, green: {} };
    var check = _.partial(checkFor, shards, plan);

    plan.red = check('red', 'UNASSIGNED');
    plan.red = check('red', 'INITIALIZING');
    plan.yellow = check('yellow', 'UNASSIGNED', plan.red);
    plan.yellow = check('yellow', 'INITIALIZING', plan.red);
    var redAndYellow = _.merge({},plan.red, plan.yellow);
    plan.green = check('green', "STARTED", redAndYellow);

    return plan;
  }; 

});
