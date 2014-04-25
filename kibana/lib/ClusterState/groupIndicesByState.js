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
        return _.isUndefined(ignoreIndices[shard.index])
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
