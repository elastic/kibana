define(function () {
  'use strict';
  return function countChildren (memo, child) {
    if (child.name !== 'Unassigned') {
      memo++;
    }
    return memo;
  };
});
