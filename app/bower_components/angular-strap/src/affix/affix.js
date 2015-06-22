'use strict';

angular.module('mgcrea.ngStrap.affix', ['mgcrea.ngStrap.helpers.dimensions', 'mgcrea.ngStrap.helpers.debounce'])

  .provider('$affix', function() {

    var defaults = this.defaults = {
      offsetTop: 'auto'
    };

    this.$get = function($window, debounce, dimensions) {

      var bodyEl = angular.element($window.document.body);
      var windowEl = angular.element($window);

      function AffixFactory(element, config) {

        var $affix = {};

        // Common vars
        var options = angular.extend({}, defaults, config);
        var targetEl = options.target;

        // Initial private vars
        var reset = 'affix affix-top affix-bottom',
            setWidth = false,
            initialAffixTop = 0,
            initialOffsetTop = 0,
            offsetTop = 0,
            offsetBottom = 0,
            affixed = null,
            unpin = null;

        var parent = element.parent();
        // Options: custom parent
        if (options.offsetParent) {
          if (options.offsetParent.match(/^\d+$/)) {
            for (var i = 0; i < (options.offsetParent * 1) - 1; i++) {
              parent = parent.parent();
            }
          }
          else {
            parent = angular.element(options.offsetParent);
          }
        }

        $affix.init = function() {

          this.$parseOffsets();
          initialOffsetTop = dimensions.offset(element[0]).top + initialAffixTop;
          setWidth = !element[0].style.width;

          // Bind events
          targetEl.on('scroll', this.checkPosition);
          targetEl.on('click', this.checkPositionWithEventLoop);
          windowEl.on('resize', this.$debouncedOnResize);

          // Both of these checkPosition() calls are necessary for the case where
          // the user hits refresh after scrolling to the bottom of the page.
          this.checkPosition();
          this.checkPositionWithEventLoop();

        };

        $affix.destroy = function() {

          // Unbind events
          targetEl.off('scroll', this.checkPosition);
          targetEl.off('click', this.checkPositionWithEventLoop);
          windowEl.off('resize', this.$debouncedOnResize);

        };

        $affix.checkPositionWithEventLoop = function() {

          // IE 9 throws an error if we use 'this' instead of '$affix'
          // in this setTimeout call
          setTimeout($affix.checkPosition, 1);

        };

        $affix.checkPosition = function() {
          // if (!this.$element.is(':visible')) return

          var scrollTop = getScrollTop();
          var position = dimensions.offset(element[0]);
          var elementHeight = dimensions.height(element[0]);

          // Get required affix class according to position
          var affix = getRequiredAffixClass(unpin, position, elementHeight);

          // Did affix status changed this last check?
          if(affixed === affix) return;
          affixed = affix;

          // Add proper affix class
          element.removeClass(reset).addClass('affix' + ((affix !== 'middle') ? '-' + affix : ''));

          if(affix === 'top') {
            unpin = null;
            element.css('position', (options.offsetParent) ? '' : 'relative');
            if(setWidth) {
              element.css('width', '');
            }
            element.css('top', '');
          } else if(affix === 'bottom') {
            if (options.offsetUnpin) {
              unpin = -(options.offsetUnpin * 1);
            }
            else {
              // Calculate unpin threshold when affixed to bottom.
              // Hopefully the browser scrolls pixel by pixel.
              unpin = position.top - scrollTop;
            }
            if(setWidth) {
              element.css('width', '');
            }
            element.css('position', (options.offsetParent) ? '' : 'relative');
            element.css('top', (options.offsetParent) ? '' : ((bodyEl[0].offsetHeight - offsetBottom - elementHeight - initialOffsetTop) + 'px'));
          } else { // affix === 'middle'
            unpin = null;
            if(setWidth) {
              element.css('width', element[0].offsetWidth + 'px');
            }
            element.css('position', 'fixed');
            element.css('top', initialAffixTop + 'px');
          }

        };

        $affix.$onResize = function() {
          $affix.$parseOffsets();
          $affix.checkPosition();
        };
        $affix.$debouncedOnResize = debounce($affix.$onResize, 50);

        $affix.$parseOffsets = function() {
          var initialPosition = element.css('position');
          // Reset position to calculate correct offsetTop
          element.css('position', (options.offsetParent) ? '' : 'relative');

          if(options.offsetTop) {
            if(options.offsetTop === 'auto') {
              options.offsetTop = '+0';
            }
            if(options.offsetTop.match(/^[-+]\d+$/)) {
              initialAffixTop = - options.offsetTop * 1;
              if(options.offsetParent) {
                offsetTop = dimensions.offset(parent[0]).top + (options.offsetTop * 1);
              }
              else {
                offsetTop = dimensions.offset(element[0]).top - dimensions.css(element[0], 'marginTop', true) + (options.offsetTop * 1);
              }
            }
            else {
              offsetTop = options.offsetTop * 1;
            }
          }

          if(options.offsetBottom) {
            if(options.offsetParent && options.offsetBottom.match(/^[-+]\d+$/)) {
              // add 1 pixel due to rounding problems...
              offsetBottom = getScrollHeight() - (dimensions.offset(parent[0]).top + dimensions.height(parent[0])) + (options.offsetBottom * 1) + 1;
            }
            else {
              offsetBottom = options.offsetBottom * 1;
            }
          }

          // Bring back the element's position after calculations
          element.css('position', initialPosition);
        };

        // Private methods

        function getRequiredAffixClass(unpin, position, elementHeight) {

          var scrollTop = getScrollTop();
          var scrollHeight = getScrollHeight();

          if(scrollTop <= offsetTop) {
            return 'top';
          } else if(unpin !== null && (scrollTop + unpin <= position.top)) {
            return 'middle';
          } else if(offsetBottom !== null && (position.top + elementHeight + initialAffixTop >= scrollHeight - offsetBottom)) {
            return 'bottom';
          } else {
            return 'middle';
          }

        }

        function getScrollTop() {
          return targetEl[0] === $window ? $window.pageYOffset : targetEl[0].scrollTop;
        }

        function getScrollHeight() {
          return targetEl[0] === $window ? $window.document.body.scrollHeight : targetEl[0].scrollHeight;
        }

        $affix.init();
        return $affix;

      }

      return AffixFactory;

    };

  })

  .directive('bsAffix', function($affix, $window) {

    return {
      restrict: 'EAC',
      require: '^?bsAffixTarget',
      link: function postLink(scope, element, attr, affixTarget) {

        var options = {scope: scope, offsetTop: 'auto', target: affixTarget ? affixTarget.$element : angular.element($window)};
        angular.forEach(['offsetTop', 'offsetBottom', 'offsetParent', 'offsetUnpin'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        var affix = $affix(element, options);
        scope.$on('$destroy', function() {
          affix && affix.destroy();
          options = null;
          affix = null;
        });

      }
    };

  })

  .directive('bsAffixTarget', function() {
    return {
      controller: function($element) {
        this.$element = $element;
      }
    };
  });
