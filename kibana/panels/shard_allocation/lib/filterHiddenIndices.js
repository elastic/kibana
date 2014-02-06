define(function () {
  'use strict';
  return function (shard) {
    return !(/^\./.test(shard.index));
  };
});
