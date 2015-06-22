/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
'use strict';

angular.module('mgcrea.ngStrap.select', ['mgcrea.ngStrap.tooltip', 'mgcrea.ngStrap.helpers.parseOptions'])

  .provider('$select', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'select',
      prefixEvent: '$select',
      placement: 'bottom-left',
      template: 'select/select.tpl.html',
      trigger: 'focus',
      container: false,
      keyboard: true,
      html: false,
      delay: 0,
      multiple: false,
      allNoneButtons: false,
      sort: true,
      caretHtml: '&nbsp;<span class="caret"></span>',
      placeholder: 'Choose among the following...',
      allText: 'All',
      noneText: 'None',
      maxLength: 3,
      maxLengthHtml: 'selected',
      iconCheckmark: 'glyphicon glyphicon-ok'
    };

    this.$get = ["$window", "$document", "$rootScope", "$tooltip", "$timeout", function($window, $document, $rootScope, $tooltip, $timeout) {

      var bodyEl = angular.element($window.document.body);
      var isNative = /(ip(a|o)d|iphone|android)/ig.test($window.navigator.userAgent);
      var isTouch = ('createTouch' in $window.document) && isNative;

      function SelectFactory(element, controller, config) {

        var $select = {};

        // Common vars
        var options = angular.extend({}, defaults, config);

        $select = $tooltip(element, options);
        var scope = $select.$scope;

        scope.$matches = [];
        scope.$activeIndex = 0;
        scope.$isMultiple = options.multiple;
        scope.$showAllNoneButtons = options.allNoneButtons && options.multiple;
        scope.$iconCheckmark = options.iconCheckmark;
        scope.$allText = options.allText;
        scope.$noneText = options.noneText;

        scope.$activate = function(index) {
          scope.$$postDigest(function() {
            $select.activate(index);
          });
        };

        scope.$select = function(index, evt) {
          scope.$$postDigest(function() {
            $select.select(index);
          });
        };

        scope.$isVisible = function() {
          return $select.$isVisible();
        };

        scope.$isActive = function(index) {
          return $select.$isActive(index);
        };

        scope.$selectAll = function () {
          for (var i = 0; i < scope.$matches.length; i++) {
            if (!scope.$isActive(i)) {
              scope.$select(i);
            }
          }
        };

        scope.$selectNone = function () {
          for (var i = 0; i < scope.$matches.length; i++) {
            if (scope.$isActive(i)) {
              scope.$select(i);
            }
          }
        };

        // Public methods

        $select.update = function(matches) {
          scope.$matches = matches;
          $select.$updateActiveIndex();
        };

        $select.activate = function(index) {
          if(options.multiple) {
            scope.$activeIndex.sort();
            $select.$isActive(index) ? scope.$activeIndex.splice(scope.$activeIndex.indexOf(index), 1) : scope.$activeIndex.push(index);
            if(options.sort) scope.$activeIndex.sort();
          } else {
            scope.$activeIndex = index;
          }
          return scope.$activeIndex;
        };

        $select.select = function(index) {
          var value = scope.$matches[index].value;
          scope.$apply(function() {
            $select.activate(index);
            if(options.multiple) {
              controller.$setViewValue(scope.$activeIndex.map(function(index) {
                return scope.$matches[index].value;
              }));
            } else {
              controller.$setViewValue(value);
              // Hide if single select
              $select.hide();
            }
          });
          // Emit event
          scope.$emit(options.prefixEvent + '.select', value, index, $select);
        };

        // Protected methods

        $select.$updateActiveIndex = function() {
          if(controller.$modelValue && scope.$matches.length) {
            if(options.multiple && angular.isArray(controller.$modelValue)) {
              scope.$activeIndex = controller.$modelValue.map(function(value) {
                return $select.$getIndex(value);
              });
            } else {
              scope.$activeIndex = $select.$getIndex(controller.$modelValue);
            }
          } else if(scope.$activeIndex >= scope.$matches.length) {
            scope.$activeIndex = options.multiple ? [] : 0;
          }
        };

        $select.$isVisible = function() {
          if(!options.minLength || !controller) {
            return scope.$matches.length;
          }
          // minLength support
          return scope.$matches.length && controller.$viewValue.length >= options.minLength;
        };

        $select.$isActive = function(index) {
          if(options.multiple) {
            return scope.$activeIndex.indexOf(index) !== -1;
          } else {
            return scope.$activeIndex === index;
          }
        };

        $select.$getIndex = function(value) {
          var l = scope.$matches.length, i = l;
          if(!l) return;
          for(i = l; i--;) {
            if(scope.$matches[i].value === value) break;
          }
          if(i < 0) return;
          return i;
        };

        $select.$onMouseDown = function(evt) {
          // Prevent blur on mousedown on .dropdown-menu
          evt.preventDefault();
          evt.stopPropagation();
          // Emulate click for mobile devices
          if(isTouch) {
            var targetEl = angular.element(evt.target);
            targetEl.triggerHandler('click');
          }
        };

        $select.$onKeyDown = function(evt) {
          if (!/(9|13|38|40)/.test(evt.keyCode)) return;
          evt.preventDefault();
          evt.stopPropagation();

          // Select with enter
          if(!options.multiple && (evt.keyCode === 13 || evt.keyCode === 9)) {
            return $select.select(scope.$activeIndex);
          }

          // Navigate with keyboard
          if(evt.keyCode === 38 && scope.$activeIndex > 0) scope.$activeIndex--;
          else if(evt.keyCode === 40 && scope.$activeIndex < scope.$matches.length - 1) scope.$activeIndex++;
          else if(angular.isUndefined(scope.$activeIndex)) scope.$activeIndex = 0;
          scope.$digest();
        };

        // Overrides

        var _show = $select.show;
        $select.show = function() {
          _show();
          if(options.multiple) {
            $select.$element.addClass('select-multiple');
          }
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            $select.$element.on(isTouch ? 'touchstart' : 'mousedown', $select.$onMouseDown);
            if(options.keyboard) {
              element.on('keydown', $select.$onKeyDown);
            }
          }, 0, false);
        };

        var _hide = $select.hide;
        $select.hide = function() {
          $select.$element.off(isTouch ? 'touchstart' : 'mousedown', $select.$onMouseDown);
          if(options.keyboard) {
            element.off('keydown', $select.$onKeyDown);
          }
          _hide(true);
        };

        return $select;

      }

      SelectFactory.defaults = defaults;
      return SelectFactory;

    }];

  })

  .directive('bsSelect', ["$window", "$parse", "$q", "$select", "$parseOptions", function($window, $parse, $q, $select, $parseOptions) {

    var defaults = $select.defaults;

    return {
      restrict: 'EAC',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        // Directive options
        var options = {scope: scope, placeholder: defaults.placeholder};
        angular.forEach(['placement', 'container', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'template', 'placeholder', 'multiple', 'allNoneButtons', 'maxLength', 'maxLengthHtml', 'allText', 'noneText', 'iconCheckmark', 'autoClose', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Add support for select markup
        if(element[0].nodeName.toLowerCase() === 'select') {
          var inputEl = element;
          inputEl.css('display', 'none');
          element = angular.element('<button type="button" class="btn btn-default"></button>');
          inputEl.after(element);
        }

        // Build proper ngOptions
        var parsedOptions = $parseOptions(attr.ngOptions);

        // Initialize select
        var select = $select(element, controller, options);

        // Watch ngOptions values before filtering for changes
        var watchedOptions = parsedOptions.$match[7].replace(/\|.+/, '').trim();
        scope.$watch(watchedOptions, function(newValue, oldValue) {
          // console.warn('scope.$watch(%s)', watchedOptions, newValue, oldValue);
          parsedOptions.valuesFn(scope, controller)
          .then(function(values) {
            select.update(values);
            controller.$render();
          });
        }, true);

        // Watch model for changes
        scope.$watch(attr.ngModel, function(newValue, oldValue) {
          // console.warn('scope.$watch(%s)', attr.ngModel, newValue, oldValue);
          select.$updateActiveIndex();
          controller.$render();
        }, true);

        // Model rendering in view
        controller.$render = function () {
          // console.warn('$render', element.attr('ng-model'), 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue, 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue);
          var selected, index;
          if(options.multiple && angular.isArray(controller.$modelValue)) {
            selected = controller.$modelValue.map(function(value) {
              index = select.$getIndex(value);
              return angular.isDefined(index) ? select.$scope.$matches[index].label : false;
            }).filter(angular.isDefined);
            if(selected.length > (options.maxLength || defaults.maxLength)) {
              selected = selected.length + ' ' + (options.maxLengthHtml || defaults.maxLengthHtml);
            } else {
              selected = selected.join(', ');
            }
          } else {
            index = select.$getIndex(controller.$modelValue);
            selected = angular.isDefined(index) ? select.$scope.$matches[index].label : false;
          }
          element.html((selected ? selected : options.placeholder) + defaults.caretHtml);
        };

        if(options.multiple){
          controller.$isEmpty = function(value){
            return !value || value.length === 0;
          };
        }

        // Garbage collection
        scope.$on('$destroy', function() {
          if (select) select.destroy();
          options = null;
          select = null;
        });

      }
    };

  }]);
