define([
  'lodash-src'
],
function (_) {
  'use strict';

  /*
    Mixins :)
  */
  _.mixin({
    move: function (array, fromIndex, toIndex) {
      array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
      return array;
    },
    remove: function (array, index) {
      array.splice(index, 1);
      return array;
    },
    // If variable is value, then return alt. If variable is anything else, return value;
    toggle: function (variable, value, alt) {
      return variable === value ? alt : value;
    },
    toggleInOut: function(array,value) {
      if(_.contains(array,value)) {
        array = _.without(array,value);
      } else {
        array.push(value);
      }
      return array;
    }
  });

  return _;
});