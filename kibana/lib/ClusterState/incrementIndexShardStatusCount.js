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
