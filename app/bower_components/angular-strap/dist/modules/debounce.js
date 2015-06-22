/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

angular.module('mgcrea.ngStrap.helpers.debounce', [])

// @source jashkenas/underscore
// @url https://github.com/jashkenas/underscore/blob/1.5.2/underscore.js#L693
.factory('debounce', ["$timeout", function($timeout) {
  return function(func, wait, immediate) {
    var timeout = null;
    return function() {
      var context = this,
        args = arguments,
        callNow = immediate && !timeout;
      if(timeout) {
        $timeout.cancel(timeout);
      }
      timeout = $timeout(function later() {
        timeout = null;
        if(!immediate) {
          func.apply(context, args);
        }
      }, wait, false);
      if(callNow) {
        func.apply(context, args);
      }
      return timeout;
    };
  };
}])


// @source jashkenas/underscore
// @url https://github.com/jashkenas/underscore/blob/1.5.2/underscore.js#L661
.factory('throttle', ["$timeout", function($timeout) {
  return function(func, wait, options) {
    var timeout = null;
    options || (options = {});
    return function() {
      var context = this,
        args = arguments;
      if(!timeout) {
        if(options.leading !== false) {
          func.apply(context, args);
        }
        timeout = $timeout(function later() {
          timeout = null;
          if(options.trailing !== false) {
            func.apply(context, args);
          }
        }, wait, false);
      }
    };
  };
}]);

