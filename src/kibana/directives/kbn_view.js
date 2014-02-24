define(function (require) {
  var angular = require('angular');

  angular
    .module('kibana/directives')
    .directive('kbnView', function modifiedNgViewFactory($route, $anchorScroll, $animate) {
      return {
        restrict: 'ECA',
        terminal: true,
        priority: 400,
        transclude: 'element',
        link: function (scope, $element, attr, ctrl, $transclude) {
          var currentScope;
          var currentElement;
          var currentTemplateUrl;
          var autoScrollExp = attr.autoscroll;
          var onloadExp = attr.onload || '';

          scope.$on('$routeChangeSuccess', update);
          update();

          function cleanupLastView() {
            if (currentScope) {
              currentScope.$destroy();
              currentScope = null;
            }
            if (currentElement) {
              $animate.leave(currentElement);
              currentElement = null;
            }
          }

          function update() {
            if ($route.current) {
              if (currentTemplateUrl && $route.current.templateUrl === currentTemplateUrl) {
                return;
              } else {
                currentTemplateUrl = $route.current.templateUrl;
              }
            }

            var locals = $route.current && $route.current.locals;
            var template = locals && locals.$template;

            if (angular.isDefined(template)) {
              var newScope = scope.$new();
              var current = $route.current;

              // Note: This will also link all children of ng-view that were contained in the original
              // html. If that content contains controllers, ... they could pollute/change the scope.
              // However, using ng-view on an element with additional content does not make sense...
              // Note: We can't remove them in the cloneAttchFn of $transclude as that
              // function is called before linking the content, which would apply child
              // directives to non existing elements.
              var clone = $transclude(newScope, function (clone) {
                $animate.enter(clone, null, currentElement || $element, function onNgViewEnter() {
                  if (angular.isDefined(autoScrollExp)
                    && (!autoScrollExp || scope.$eval(autoScrollExp))) {
                    $anchorScroll();
                  }
                });
                cleanupLastView();
              });

              currentElement = clone;
              currentScope = current.scope = newScope;
              currentScope.$emit('$viewContentLoaded');
              currentScope.$eval(onloadExp);
            } else {
              cleanupLastView();
            }
          }
        }
      };
    })
    .directive('kbnView', function modifiedNgViewFillContentFactory($compile, $controller, $route) {
      return {
        restrict: 'ECA',
        priority: -400,
        link: function (scope, $element) {
          var current = $route.current,
              locals = current.locals;

          $element.html(locals.$template);

          var link = $compile($element.contents());

          if (current.controller) {
            locals.$scope = scope;
            var controller = $controller(current.controller, locals);
            if (current.controllerAs) {
              scope[current.controllerAs] = controller;
            }
            $element.data('$ngControllerController', controller);
            $element.children().data('$ngControllerController', controller);
          }

          link(scope);
        }
      };
    });

});