define(function (require) {
  'use strict';
  var _ = require('lodash');
  var filterShards = require('./filterShards');
  var incrementIndexShardStatusCount = require('./incrementIndexShardStatusCount');
  var extractShards = require('lib/extractShards');

  var checkFor = function (shards, plan, status, state) {
    var primary = (status === 'red');
    return _.chain(shards)
      .filter(filterShards(state.toUpperCase(), primary))
      .reduce(incrementIndexShardStatusCount(state.toLowerCase()), plan[status])
      .value();
  };

  return function (state) {
    var shards = extractShards(state);
    var plan = { red: {}, yellow: {} };
    var check = _.partial(checkFor, shards, plan);

    plan.red = check('red', 'UNASSIGNED');
    plan.red = check('red', 'INITIALIZING');
    plan.yellow = check('yellow', 'UNASSIGNED');
    plan.yellow = check('yellow', 'INITIALIZING');

    return plan;
  }; 

});
