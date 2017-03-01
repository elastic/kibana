import _ from 'lodash';
import $ from 'jquery';
import uiModules from 'ui/modules';
import invertFilterTemplate from 'ui/directives/partials/filter_invert.html';
const module = uiModules.get('kibana');
module.controller('filterInvertController', function () {
  /* from modernizer
   https://raw.githubusercontent.com/Modernizr/Modernizr/master/feature-detects/css/filters.js
   */
  this.isFilterSupported = () => {
    const el = document.createElement('a');
    el.style.cssText = '-o-filter:blur(2px); -ms-filter:blur(2px); -moz-filter:blur(2px); -webkit-filter:blur(2px); filter:blur(2px);';
    return !!el.style.length && ((document.documentMode === undefined || document.documentMode > 9));
  };
});
module.directive('filterInvert', function ($compile) {
  return {
    restrict: 'A',
    controllerAs: 'ctrl',
    bindToController: true,
    controller: 'filterInvertController',
    link: function ($scope, $elem, $attrs, ctrl) {
      function invert($elem) {
        $scope.opts = {
          svgWidth: $elem.width(),
          svgHeight: $elem.height(),
          svgSource: $elem.attr('src'),
          className: $elem.attr('class')
        };

        $elem.addClass('hide');
        $elem.after($compile(invertFilterTemplate)($scope));
      }
      if ($elem.prop('nodeName') !== 'IMG') return;
      if (!ctrl.isFilterSupported()) {
        $elem.css('visibility', 'hidden');
        $elem.on('load', () => {
          invert($elem);
        });
      } else {
        const filterString = `invert(100%)`;
        $elem.css({
          'filter': filterString,
          '-webkit-filter': filterString,
          '-moz-filter': filterString,
          '-o-filter': filterString,
          '-ms-filter': filterString
        });
      }
    }
  };
});
