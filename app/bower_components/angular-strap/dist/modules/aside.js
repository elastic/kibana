/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

angular.module('mgcrea.ngStrap.aside', ['mgcrea.ngStrap.modal'])

  .provider('$aside', function() {

    var defaults = this.defaults = {
      animation: 'am-fade-and-slide-right',
      prefixClass: 'aside',
      prefixEvent: 'aside',
      placement: 'right',
      template: 'aside/aside.tpl.html',
      contentTemplate: false,
      container: false,
      element: null,
      backdrop: true,
      keyboard: true,
      html: false,
      show: true
    };

    this.$get = ["$modal", function($modal) {

      function AsideFactory(config) {

        var $aside = {};

        // Common vars
        var options = angular.extend({}, defaults, config);

        $aside = $modal(options);

        return $aside;

      }

      return AsideFactory;

    }];

  })

  .directive('bsAside', ["$window", "$sce", "$aside", function($window, $sce, $aside) {

    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {
        // Directive options
        var options = {scope: scope, element: element, show: false};
        angular.forEach(['template', 'contentTemplate', 'placement', 'backdrop', 'keyboard', 'html', 'container', 'animation'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as data-attrs
        angular.forEach(['title', 'content'], function(key) {
          attr[key] && attr.$observe(key, function(newValue, oldValue) {
            scope[key] = $sce.trustAsHtml(newValue);
          });
        });

        // Support scope as an object
        attr.bsAside && scope.$watch(attr.bsAside, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
        }, true);

        // Initialize aside
        var aside = $aside(options);

        // Trigger
        element.on(attr.trigger || 'click', aside.toggle);

        // Garbage collection
        scope.$on('$destroy', function() {
          if (aside) aside.destroy();
          options = null;
          aside = null;
        });

      }
    };

  }]);
