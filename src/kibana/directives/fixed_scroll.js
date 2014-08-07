// Creates a fake scrollbar at the bottom of an element. Useful for infinite scrolling components
define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');
  var _ = require('lodash');

  module.directive('fixedScroll', function ($timeout) {
    return {
      restrict: 'A',
      scope: {
        fixedScrollTrigger: '=fixedScrollTrigger',
        anchor: '@fixedScroll',
      },
      link: function ($scope, $elem, attrs) {

        var options = {
          contentElement: _.isUndefined($scope.anchor) ? undefined : $elem.find($scope.anchor),
          fixedScrollMarkup: '<div class="fixedScroll-container" ' +
            'style="height: 20px;"><div class="fixedScroll-scroll" style="height: 20px;"></div></div>',
          fixedScrollInnerSelector: '.fixedScroll-scroll'
        };

        var innerElem;
        // Set the inner element that gives context to the scroll
        if (options.contentElement !== undefined && $elem.find(options.contentElement).length !== 0) {
          innerElem = $elem.find(options.contentElement);
        } else {
          innerElem = $elem.find('>:first-child');
        }

        var fixedScroll = $($(options.fixedScrollMarkup));
        fixedScroll.css({position: 'fixed', bottom: 0});


        var addScroll = function ($elem, options) {

          // If content isn't wide enough to scroll, abort
          if ($elem.get(0).scrollWidth <= $elem.width()) {
            return;
          }

          // add container for fake scrollbar
          $elem.after(fixedScroll);

          // bind fixed scroll to real scroll
          fixedScroll.bind('scroll.fixedScroll', function () {
            $elem.scrollLeft(fixedScroll.scrollLeft());
          });

          // and bind real scroll to fixed scroll
          var scrollHandler = function () {
            fixedScroll.scrollLeft($elem.scrollLeft());
          };
          $elem.bind('scroll.fixedScroll', scrollHandler);

          fixedScroll.css({'overflow-x': 'auto', 'overflow-y': 'hidden'});
          $elem.css({'overflow-x': 'auto', 'overflow-y': 'hidden'});

          // Check the width until it stops changing
          var setWidth = function (innerElemWidth) {
            $timeout(function () {
              if (innerElemWidth !== innerElem.outerWidth()) {
                setWidth(innerElem.outerWidth());
              } else {
                $(options.fixedScrollInnerSelector, fixedScroll).width(innerElem.outerWidth());
                fixedScroll.width($elem.width());
              }
            }, 500);
          };

          setWidth(innerElem.outerWidth());

        };

        addScroll($elem, options);

        var recompute = function () {
          $elem.unbind('scroll.fixedScroll');
          $elem.prev('div.fixedScroll-container').remove();
          addScroll($elem, options);
        };

        // Create a watchable for the content element
        $scope.innerElemWidth = function () {
          return innerElem.outerWidth();
        };

        // Watch window size
        $(window).resize(recompute);

        // Watch the trigger if there is one
        $scope.$watch('trigger', function () {
          recompute();
        });

        // And watch the element width
        $scope.$watch('innerElemWidth()', function (width) {
          recompute();
        });

        // Clean up listeners
        $scope.$on('$destroy', function () {
          $elem.unbind('scroll.fixedScroll');
          fixedScroll.unbind('scroll.fixedScroll');
        });

      }
    };
  });
});