'use strict';

angular.module('mgcrea.ngStrap.scrollspy', ['mgcrea.ngStrap.helpers.debounce', 'mgcrea.ngStrap.helpers.dimensions'])

  .provider('$scrollspy', function() {

    // Pool of registered spies
    var spies = this.$$spies = {};

    var defaults = this.defaults = {
      debounce: 150,
      throttle: 100,
      offset: 100
    };

    this.$get = function($window, $document, $rootScope, dimensions, debounce, throttle) {

      var windowEl = angular.element($window);
      var docEl = angular.element($document.prop('documentElement'));
      var bodyEl = angular.element($window.document.body);

      // Helper functions

      function nodeName(element, name) {
        return element[0].nodeName && element[0].nodeName.toLowerCase() === name.toLowerCase();
      }

      function ScrollSpyFactory(config) {

        // Common vars
        var options = angular.extend({}, defaults, config);
        if(!options.element) options.element = bodyEl;
        var isWindowSpy = nodeName(options.element, 'body');
        var scrollEl = isWindowSpy ? windowEl : options.element;
        var scrollId = isWindowSpy ? 'window' : options.id;

        // Use existing spy
        if(spies[scrollId]) {
          spies[scrollId].$$count++;
          return spies[scrollId];
        }

        var $scrollspy = {};

        // Private vars
        var unbindViewContentLoaded, unbindIncludeContentLoaded;
        var trackedElements = $scrollspy.$trackedElements = [];
        var sortedElements = [];
        var activeTarget;
        var debouncedCheckPosition;
        var throttledCheckPosition;
        var debouncedCheckOffsets;
        var viewportHeight;
        var scrollTop;

        $scrollspy.init = function() {

          // Setup internal ref counter
          this.$$count = 1;

          // Bind events
          debouncedCheckPosition = debounce(this.checkPosition, options.debounce);
          throttledCheckPosition = throttle(this.checkPosition, options.throttle);
          scrollEl.on('click', this.checkPositionWithEventLoop);
          windowEl.on('resize', debouncedCheckPosition);
          scrollEl.on('scroll', throttledCheckPosition);

          debouncedCheckOffsets = debounce(this.checkOffsets, options.debounce);
          unbindViewContentLoaded = $rootScope.$on('$viewContentLoaded', debouncedCheckOffsets);
          unbindIncludeContentLoaded = $rootScope.$on('$includeContentLoaded', debouncedCheckOffsets);
          debouncedCheckOffsets();

          // Register spy for reuse
          if(scrollId) {
            spies[scrollId] = $scrollspy;
          }

        };

        $scrollspy.destroy = function() {

          // Check internal ref counter
          this.$$count--;
          if(this.$$count > 0) {
            return;
          }

          // Unbind events
          scrollEl.off('click', this.checkPositionWithEventLoop);
          windowEl.off('resize', debouncedCheckPosition);
          scrollEl.off('scroll', throttledCheckPosition);
          unbindViewContentLoaded();
          unbindIncludeContentLoaded();
          if (scrollId) {
            delete spies[scrollId];
          }
        };

        $scrollspy.checkPosition = function() {

          // Not ready yet
          if(!sortedElements.length) return;

          // Calculate the scroll position
          scrollTop = (isWindowSpy ? $window.pageYOffset : scrollEl.prop('scrollTop')) || 0;

          // Calculate the viewport height for use by the components
          viewportHeight = Math.max($window.innerHeight, docEl.prop('clientHeight'));

          // Activate first element if scroll is smaller
          if(scrollTop < sortedElements[0].offsetTop && activeTarget !== sortedElements[0].target) {
            return $scrollspy.$activateElement(sortedElements[0]);
          }

          // Activate proper element
          for (var i = sortedElements.length; i--;) {
            if(angular.isUndefined(sortedElements[i].offsetTop) || sortedElements[i].offsetTop === null) continue;
            if(activeTarget === sortedElements[i].target) continue;
            if(scrollTop < sortedElements[i].offsetTop) continue;
            if(sortedElements[i + 1] && scrollTop > sortedElements[i + 1].offsetTop) continue;
            return $scrollspy.$activateElement(sortedElements[i]);
          }

        };

        $scrollspy.checkPositionWithEventLoop = function() {
          // IE 9 throws an error if we use 'this' instead of '$scrollspy'
          // in this setTimeout call
          setTimeout($scrollspy.checkPosition, 1);
        };

        // Protected methods

        $scrollspy.$activateElement = function(element) {
          if(activeTarget) {
            var activeElement = $scrollspy.$getTrackedElement(activeTarget);
            if(activeElement) {
              activeElement.source.removeClass('active');
              if(nodeName(activeElement.source, 'li') && nodeName(activeElement.source.parent().parent(), 'li')) {
                activeElement.source.parent().parent().removeClass('active');
              }
            }
          }
          activeTarget = element.target;
          element.source.addClass('active');
          if(nodeName(element.source, 'li') && nodeName(element.source.parent().parent(), 'li')) {
            element.source.parent().parent().addClass('active');
          }
        };

        $scrollspy.$getTrackedElement = function(target) {
          return trackedElements.filter(function(obj) {
            return obj.target === target;
          })[0];
        };

        // Track offsets behavior

        $scrollspy.checkOffsets = function() {

          angular.forEach(trackedElements, function(trackedElement) {
            var targetElement = document.querySelector(trackedElement.target);
            trackedElement.offsetTop = targetElement ? dimensions.offset(targetElement).top : null;
            if(options.offset && trackedElement.offsetTop !== null) trackedElement.offsetTop -= options.offset * 1;
          });

          sortedElements = trackedElements
          .filter(function(el) {
            return el.offsetTop !== null;
          })
          .sort(function(a, b) {
            return a.offsetTop - b.offsetTop;
          });

          debouncedCheckPosition();

        };

        $scrollspy.trackElement = function(target, source) {
          trackedElements.push({target: target, source: source});
        };

        $scrollspy.untrackElement = function(target, source) {
          var toDelete;
          for (var i = trackedElements.length; i--;) {
            if(trackedElements[i].target === target && trackedElements[i].source === source) {
              toDelete = i;
              break;
            }
          }
          trackedElements = trackedElements.splice(toDelete, 1);
        };

        $scrollspy.activate = function(i) {
          trackedElements[i].addClass('active');
        };

        // Initialize plugin

        $scrollspy.init();
        return $scrollspy;

      }

      return ScrollSpyFactory;

    };

  })

  .directive('bsScrollspy', function($rootScope, debounce, dimensions, $scrollspy) {

    return {
      restrict: 'EAC',
      link: function postLink(scope, element, attr) {

        var options = {scope: scope};
        angular.forEach(['offset', 'target'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        var scrollspy = $scrollspy(options);
        scrollspy.trackElement(options.target, element);

        scope.$on('$destroy', function() {
          if (scrollspy) {
            scrollspy.untrackElement(options.target, element);
            scrollspy.destroy();
          }
          options = null;
          scrollspy = null;
        });

      }
    };

  })


  .directive('bsScrollspyList', function($rootScope, debounce, dimensions, $scrollspy) {

    return {
      restrict: 'A',
      compile: function postLink(element, attr) {
        var children = element[0].querySelectorAll('li > a[href]');
        angular.forEach(children, function(child) {
          var childEl = angular.element(child);
          childEl.parent().attr('bs-scrollspy', '').attr('data-target', childEl.attr('href'));
        });
      }

    };

  });
