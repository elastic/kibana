/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

(angular.version.minor < 3 && angular.version.dot < 14) && angular.module('ng')

.factory('$$rAF', ["$window", "$timeout", function($window, $timeout) {

  var requestAnimationFrame = $window.requestAnimationFrame ||
                              $window.webkitRequestAnimationFrame ||
                              $window.mozRequestAnimationFrame;

  var cancelAnimationFrame = $window.cancelAnimationFrame ||
                             $window.webkitCancelAnimationFrame ||
                             $window.mozCancelAnimationFrame ||
                             $window.webkitCancelRequestAnimationFrame;

  var rafSupported = !!requestAnimationFrame;
  var raf = rafSupported ?
    function(fn) {
      var id = requestAnimationFrame(fn);
      return function() {
        cancelAnimationFrame(id);
      };
    } :
    function(fn) {
      var timer = $timeout(fn, 16.66, false); // 1000 / 60 = 16.666
      return function() {
        $timeout.cancel(timer);
      };
    };

  raf.supported = rafSupported;

  return raf;

}]);

// .factory('$$animateReflow', function($$rAF, $document) {

//   var bodyEl = $document[0].body;

//   return function(fn) {
//     //the returned function acts as the cancellation function
//     return $$rAF(function() {
//       //the line below will force the browser to perform a repaint
//       //so that all the animated elements within the animation frame
//       //will be properly updated and drawn on screen. This is
//       //required to perform multi-class CSS based animations with
//       //Firefox. DO NOT REMOVE THIS LINE.
//       var a = bodyEl.offsetWidth + 1;
//       fn();
//     });
//   };

// });
