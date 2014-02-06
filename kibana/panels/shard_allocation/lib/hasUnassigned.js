define(function () {
  'use strict';
  return function (item) {
    return item.unassigned && item.unassigned.length > 0 || false;
  };
});
