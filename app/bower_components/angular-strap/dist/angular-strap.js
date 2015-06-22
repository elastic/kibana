/**
 * angular-strap
 * @version v2.1.6 - 2015-01-11
 * @link http://mgcrea.github.io/angular-strap
 * @author Olivier Louvignes (olivier@mg-crea.com)
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function(window, document, undefined) {
'use strict';
// Source: module.js
angular.module('mgcrea.ngStrap', [
  'mgcrea.ngStrap.modal',
  'mgcrea.ngStrap.aside',
  'mgcrea.ngStrap.alert',
  'mgcrea.ngStrap.button',
  'mgcrea.ngStrap.select',
  'mgcrea.ngStrap.datepicker',
  'mgcrea.ngStrap.timepicker',
  'mgcrea.ngStrap.navbar',
  'mgcrea.ngStrap.tooltip',
  'mgcrea.ngStrap.popover',
  'mgcrea.ngStrap.dropdown',
  'mgcrea.ngStrap.typeahead',
  'mgcrea.ngStrap.scrollspy',
  'mgcrea.ngStrap.affix',
  'mgcrea.ngStrap.tab',
  'mgcrea.ngStrap.collapse'
]);

// Source: affix.js
angular.module('mgcrea.ngStrap.affix', ['mgcrea.ngStrap.helpers.dimensions', 'mgcrea.ngStrap.helpers.debounce'])

  .provider('$affix', function() {

    var defaults = this.defaults = {
      offsetTop: 'auto'
    };

    this.$get = ["$window", "debounce", "dimensions", function($window, debounce, dimensions) {

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

    }];

  })

  .directive('bsAffix', ["$affix", "$window", function($affix, $window) {

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

  }])

  .directive('bsAffixTarget', function() {
    return {
      controller: ["$element", function($element) {
        this.$element = $element;
      }]
    };
  });

// Source: alert.js
// @BUG: following snippet won't compile correctly
// @TODO: submit issue to core
// '<span ng-if="title"><strong ng-bind="title"></strong>&nbsp;</span><span ng-bind-html="content"></span>' +

angular.module('mgcrea.ngStrap.alert', ['mgcrea.ngStrap.modal'])

  .provider('$alert', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'alert',
      prefixEvent: 'alert',
      placement: null,
      template: 'alert/alert.tpl.html',
      container: false,
      element: null,
      backdrop: false,
      keyboard: true,
      show: true,
      // Specific options
      duration: false,
      type: false,
      dismissable: true
    };

    this.$get = ["$modal", "$timeout", function($modal, $timeout) {

      function AlertFactory(config) {

        var $alert = {};

        // Common vars
        var options = angular.extend({}, defaults, config);

        $alert = $modal(options);

        // Support scope as string options [/*title, content, */ type, dismissable]
        $alert.$scope.dismissable = !!options.dismissable;
        if(options.type) {
          $alert.$scope.type = options.type;
        }

        // Support auto-close duration
        var show = $alert.show;
        if(options.duration) {
          $alert.show = function() {
            show();
            $timeout(function() {
              $alert.hide();
            }, options.duration * 1000);
          };
        }

        return $alert;

      }

      return AlertFactory;

    }];

  })

  .directive('bsAlert', ["$window", "$sce", "$alert", function($window, $sce, $alert) {

    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {

        // Directive options
        var options = {scope: scope, element: element, show: false};
        angular.forEach(['template', 'placement', 'keyboard', 'html', 'container', 'animation', 'duration', 'dismissable'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as data-attrs
        angular.forEach(['title', 'content', 'type'], function(key) {
          attr[key] && attr.$observe(key, function(newValue, oldValue) {
            scope[key] = $sce.trustAsHtml(newValue);
          });
        });

        // Support scope as an object
        attr.bsAlert && scope.$watch(attr.bsAlert, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
        }, true);

        // Initialize alert
        var alert = $alert(options);

        // Trigger
        element.on(attr.trigger || 'click', alert.toggle);

        // Garbage collection
        scope.$on('$destroy', function() {
          if (alert) alert.destroy();
          options = null;
          alert = null;
        });

      }
    };

  }]);

// Source: aside.js
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

// Source: button.js
angular.module('mgcrea.ngStrap.button', [])

  .provider('$button', function() {

    var defaults = this.defaults = {
      activeClass:'active',
      toggleEvent:'click'
    };

    this.$get = function() {
      return {defaults: defaults};
    };

  })

  .directive('bsCheckboxGroup', function() {

    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function postLink(element, attr) {
        element.attr('data-toggle', 'buttons');
        element.removeAttr('ng-model');
        var children = element[0].querySelectorAll('input[type="checkbox"]');
        angular.forEach(children, function(child) {
          var childEl = angular.element(child);
          childEl.attr('bs-checkbox', '');
          childEl.attr('ng-model', attr.ngModel + '.' + childEl.attr('value'));
        });
      }

    };

  })

  .directive('bsCheckbox', ["$button", "$$rAF", function($button, $$rAF) {

    var defaults = $button.defaults;
    var constantValueRegExp = /^(true|false|\d+)$/;

    return {
      restrict: 'A',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        var options = defaults;

        // Support label > input[type="checkbox"]
        var isInput = element[0].nodeName === 'INPUT';
        var activeElement = isInput ? element.parent() : element;

        var trueValue = angular.isDefined(attr.trueValue) ? attr.trueValue : true;
        if(constantValueRegExp.test(attr.trueValue)) {
          trueValue = scope.$eval(attr.trueValue);
        }
        var falseValue = angular.isDefined(attr.falseValue) ? attr.falseValue : false;
        if(constantValueRegExp.test(attr.falseValue)) {
          falseValue = scope.$eval(attr.falseValue);
        }

        // Parse exotic values
        var hasExoticValues = typeof trueValue !== 'boolean' || typeof falseValue !== 'boolean';
        if(hasExoticValues) {
          controller.$parsers.push(function(viewValue) {
            // console.warn('$parser', element.attr('ng-model'), 'viewValue', viewValue);
            return viewValue ? trueValue : falseValue;
          });
          // modelValue -> $formatters -> viewValue
          controller.$formatters.push(function(modelValue) {
             // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
             return angular.equals(modelValue, trueValue);
          });
          // Fix rendering for exotic values
          scope.$watch(attr.ngModel, function(newValue, oldValue) {
            controller.$render();
          });
        }

        // model -> view
        controller.$render = function () {
          // console.warn('$render', element.attr('ng-model'), 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue, 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue);
          var isActive = angular.equals(controller.$modelValue, trueValue);
          $$rAF(function() {
            if(isInput) element[0].checked = isActive;
            activeElement.toggleClass(options.activeClass, isActive);
          });
        };

        // view -> model
        element.bind(options.toggleEvent, function() {
          scope.$apply(function () {
            // console.warn('!click', element.attr('ng-model'), 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue, 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue);
            if(!isInput) {
              controller.$setViewValue(!activeElement.hasClass('active'));
            }
            if(!hasExoticValues) {
              controller.$render();
            }
          });
        });

      }

    };

  }])

  .directive('bsRadioGroup', function() {

    return {
      restrict: 'A',
      require: 'ngModel',
      compile: function postLink(element, attr) {
        element.attr('data-toggle', 'buttons');
        element.removeAttr('ng-model');
        var children = element[0].querySelectorAll('input[type="radio"]');
        angular.forEach(children, function(child) {
          angular.element(child).attr('bs-radio', '');
          angular.element(child).attr('ng-model', attr.ngModel);
        });
      }

    };

  })

  .directive('bsRadio', ["$button", "$$rAF", function($button, $$rAF) {

    var defaults = $button.defaults;
    var constantValueRegExp = /^(true|false|\d+)$/;

    return {
      restrict: 'A',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        var options = defaults;

        // Support `label > input[type="radio"]` markup
        var isInput = element[0].nodeName === 'INPUT';
        var activeElement = isInput ? element.parent() : element;

        var value = constantValueRegExp.test(attr.value) ? scope.$eval(attr.value) : attr.value;

        // model -> view
        controller.$render = function () {
          // console.warn('$render', element.attr('value'), 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue, 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue);
          var isActive = angular.equals(controller.$modelValue, value);
          $$rAF(function() {
            if(isInput) element[0].checked = isActive;
            activeElement.toggleClass(options.activeClass, isActive);
          });
        };

        // view -> model
        element.bind(options.toggleEvent, function() {
          scope.$apply(function () {
            // console.warn('!click', element.attr('value'), 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue, 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue);
            controller.$setViewValue(value);
            controller.$render();
          });
        });

      }

    };

  }]);

// Source: collapse.js
angular.module('mgcrea.ngStrap.collapse', [])

  .provider('$collapse', function() {

    var defaults = this.defaults = {
      animation: 'am-collapse',
      disallowToggle: false,
      activeClass: 'in',
      startCollapsed: false,
      allowMultiple: false
    };

    var controller = this.controller = function($scope, $element, $attrs) {
      var self = this;

      // Attributes options
      self.$options = angular.copy(defaults);
      angular.forEach(['animation', 'disallowToggle', 'activeClass', 'startCollapsed', 'allowMultiple'], function (key) {
        if(angular.isDefined($attrs[key])) self.$options[key] = $attrs[key];
      });

      self.$toggles = [];
      self.$targets = [];

      self.$viewChangeListeners = [];

      self.$registerToggle = function(element) {
        self.$toggles.push(element);
      };
      self.$registerTarget = function(element) {
        self.$targets.push(element);
      };

      self.$unregisterToggle = function(element) {
        var index = self.$toggles.indexOf(element);
        // remove toggle from $toggles array
        self.$toggles.splice(index, 1);
      };
      self.$unregisterTarget = function(element) {
        var index = self.$targets.indexOf(element);

        // remove element from $targets array
        self.$targets.splice(index, 1);

        if (self.$options.allowMultiple) {
          // remove target index from $active array values
          deactivateItem(element);
        }

        // fix active item indexes
        fixActiveItemIndexes(index);

        self.$viewChangeListeners.forEach(function(fn) {
          fn();
        });
      };

      // use array to store all the currently open panels
      self.$targets.$active = !self.$options.startCollapsed ? [0] : [];
      self.$setActive = $scope.$setActive = function(value) {
        if(angular.isArray(value)) {
          self.$targets.$active = angular.copy(value);
        }
        else if(!self.$options.disallowToggle) {
          // toogle element active status
          isActive(value) ? deactivateItem(value) : activateItem(value);
        } else {
          activateItem(value);
        }

        self.$viewChangeListeners.forEach(function(fn) {
          fn();
        });
      };

      self.$activeIndexes = function() {
        return self.$options.allowMultiple ? self.$targets.$active :
          self.$targets.$active.length === 1 ? self.$targets.$active[0] : -1;
      };

      function fixActiveItemIndexes(index) {
        // item with index was removed, so we
        // need to adjust other items index values
        var activeIndexes = self.$targets.$active;
        for(var i = 0; i < activeIndexes.length; i++) {
          if (index < activeIndexes[i]) {
            activeIndexes[i] = activeIndexes[i] - 1;
          }

          // the last item is active, so we need to
          // adjust its index
          if (activeIndexes[i] === self.$targets.length) {
            activeIndexes[i] = self.$targets.length - 1;
          }
        }
      }

      function isActive(value) {
        var activeItems = self.$targets.$active;
        return activeItems.indexOf(value) === -1 ? false : true;
      }

      function deactivateItem(value) {
        var index = self.$targets.$active.indexOf(value);
        if (index !== -1) {
          self.$targets.$active.splice(index, 1);
        }
      }

      function activateItem(value) {
        if (!self.$options.allowMultiple) {
          // remove current selected item
          self.$targets.$active.splice(0, 1);
        }

        if (self.$targets.$active.indexOf(value) === -1) {
          self.$targets.$active.push(value);
        }
      }

    };

    this.$get = function() {
      var $collapse = {};
      $collapse.defaults = defaults;
      $collapse.controller = controller;
      return $collapse;
    };

  })

  .directive('bsCollapse', ["$window", "$animate", "$collapse", function($window, $animate, $collapse) {

    var defaults = $collapse.defaults;

    return {
      require: ['?ngModel', 'bsCollapse'],
      controller: ['$scope', '$element', '$attrs', $collapse.controller],
      link: function postLink(scope, element, attrs, controllers) {

        var ngModelCtrl = controllers[0];
        var bsCollapseCtrl = controllers[1];

        if(ngModelCtrl) {

          // Update the modelValue following
          bsCollapseCtrl.$viewChangeListeners.push(function() {
            ngModelCtrl.$setViewValue(bsCollapseCtrl.$activeIndexes());
          });

          // modelValue -> $formatters -> viewValue
          ngModelCtrl.$formatters.push(function(modelValue) {
            // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
            if (angular.isArray(modelValue)) {
              // model value is an array, so just replace
              // the active items directly
              bsCollapseCtrl.$setActive(modelValue);
            }
            else {
              var activeIndexes = bsCollapseCtrl.$activeIndexes();

              if (angular.isArray(activeIndexes)) {
                // we have an array of selected indexes
                if (activeIndexes.indexOf(modelValue * 1) === -1) {
                  // item with modelValue index is not active
                  bsCollapseCtrl.$setActive(modelValue * 1);
                }
              }
              else if (activeIndexes !== modelValue * 1) {
                bsCollapseCtrl.$setActive(modelValue * 1);
              }
            }
            return modelValue;
          });

        }

      }
    };

  }])

  .directive('bsCollapseToggle', function() {

    return {
      require: ['^?ngModel', '^bsCollapse'],
      link: function postLink(scope, element, attrs, controllers) {

        var ngModelCtrl = controllers[0];
        var bsCollapseCtrl = controllers[1];

        // Add base attr
        element.attr('data-toggle', 'collapse');

        // Push pane to parent bsCollapse controller
        bsCollapseCtrl.$registerToggle(element);

        // remove toggle from collapse controller when toggle is destroyed
        scope.$on('$destroy', function() {
          bsCollapseCtrl.$unregisterToggle(element);
        });

        element.on('click', function() {
          var index = attrs.bsCollapseToggle || bsCollapseCtrl.$toggles.indexOf(element);
          bsCollapseCtrl.$setActive(index * 1);
          scope.$apply();
        });

      }
    };

  })

  .directive('bsCollapseTarget', ["$animate", function($animate) {

    return {
      require: ['^?ngModel', '^bsCollapse'],
      // scope: true,
      link: function postLink(scope, element, attrs, controllers) {

        var ngModelCtrl = controllers[0];
        var bsCollapseCtrl = controllers[1];

        // Add base class
        element.addClass('collapse');

        // Add animation class
        if(bsCollapseCtrl.$options.animation) {
          element.addClass(bsCollapseCtrl.$options.animation);
        }

        // Push pane to parent bsCollapse controller
        bsCollapseCtrl.$registerTarget(element);

        // remove pane target from collapse controller when target is destroyed
        scope.$on('$destroy', function() {
          bsCollapseCtrl.$unregisterTarget(element);
        });

        function render() {
          var index = bsCollapseCtrl.$targets.indexOf(element);
          var active = bsCollapseCtrl.$activeIndexes();
          var action = 'removeClass';
          if (angular.isArray(active)) {
            if (active.indexOf(index) !== -1) {
              action = 'addClass';
            }
          }
          else if (index === active) {
            action = 'addClass';
          }

          $animate[action](element, bsCollapseCtrl.$options.activeClass);
        }

        bsCollapseCtrl.$viewChangeListeners.push(function() {
          render();
        });
        render();

      }
    };

  }]);

// Source: datepicker.js
angular.module('mgcrea.ngStrap.datepicker', [
  'mgcrea.ngStrap.helpers.dateParser',
  'mgcrea.ngStrap.helpers.dateFormatter',
  'mgcrea.ngStrap.tooltip'])

  .provider('$datepicker', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'datepicker',
      placement: 'bottom-left',
      template: 'datepicker/datepicker.tpl.html',
      trigger: 'focus',
      container: false,
      keyboard: true,
      html: false,
      delay: 0,
      // lang: $locale.id,
      useNative: false,
      dateType: 'date',
      dateFormat: 'shortDate',
      modelDateFormat: null,
      dayFormat: 'dd',
      monthFormat: 'MMM',
      yearFormat: 'yyyy',
      monthTitleFormat: 'MMMM yyyy',
      yearTitleFormat: 'yyyy',
      strictFormat: false,
      autoclose: false,
      minDate: -Infinity,
      maxDate: +Infinity,
      startView: 0,
      minView: 0,
      startWeek: 0,
      daysOfWeekDisabled: '',
      iconLeft: 'glyphicon glyphicon-chevron-left',
      iconRight: 'glyphicon glyphicon-chevron-right'
    };

    this.$get = ["$window", "$document", "$rootScope", "$sce", "$dateFormatter", "datepickerViews", "$tooltip", "$timeout", function($window, $document, $rootScope, $sce, $dateFormatter, datepickerViews, $tooltip, $timeout) {

      var bodyEl = angular.element($window.document.body);
      var isNative = /(ip(a|o)d|iphone|android)/ig.test($window.navigator.userAgent);
      var isTouch = ('createTouch' in $window.document) && isNative;
      if(!defaults.lang) defaults.lang = $dateFormatter.getDefaultLocale();

      function DatepickerFactory(element, controller, config) {

        var $datepicker = $tooltip(element, angular.extend({}, defaults, config));
        var parentScope = config.scope;
        var options = $datepicker.$options;
        var scope = $datepicker.$scope;
        if(options.startView) options.startView -= options.minView;

        // View vars

        var pickerViews = datepickerViews($datepicker);
        $datepicker.$views = pickerViews.views;
        var viewDate = pickerViews.viewDate;
        scope.$mode = options.startView;
        scope.$iconLeft = options.iconLeft;
        scope.$iconRight = options.iconRight;
        var $picker = $datepicker.$views[scope.$mode];

        // Scope methods

        scope.$select = function(date) {
          $datepicker.select(date);
        };
        scope.$selectPane = function(value) {
          $datepicker.$selectPane(value);
        };
        scope.$toggleMode = function() {
          $datepicker.setMode((scope.$mode + 1) % $datepicker.$views.length);
        };

        // Public methods

        $datepicker.update = function(date) {
          // console.warn('$datepicker.update() newValue=%o', date);
          if(angular.isDate(date) && !isNaN(date.getTime())) {
            $datepicker.$date = date;
            $picker.update.call($picker, date);
          }
          // Build only if pristine
          $datepicker.$build(true);
        };

        $datepicker.updateDisabledDates = function(dateRanges) {
          options.disabledDateRanges = dateRanges;
          for(var i = 0, l = scope.rows.length; i < l; i++) {
            angular.forEach(scope.rows[i], $datepicker.$setDisabledEl);
          }
        };

        $datepicker.select = function(date, keep) {
          // console.warn('$datepicker.select', date, scope.$mode);
          if(!angular.isDate(controller.$dateValue)) controller.$dateValue = new Date(date);
          if(!scope.$mode || keep) {
            controller.$setViewValue(angular.copy(date));
            controller.$render();
            if(options.autoclose && !keep) {
              $timeout(function() { $datepicker.hide(true); });
            }
          } else {
            angular.extend(viewDate, {year: date.getFullYear(), month: date.getMonth(), date: date.getDate()});
            $datepicker.setMode(scope.$mode - 1);
            $datepicker.$build();
          }
        };

        $datepicker.setMode = function(mode) {
          // console.warn('$datepicker.setMode', mode);
          scope.$mode = mode;
          $picker = $datepicker.$views[scope.$mode];
          $datepicker.$build();
        };

        // Protected methods

        $datepicker.$build = function(pristine) {
          // console.warn('$datepicker.$build() viewDate=%o', viewDate);
          if(pristine === true && $picker.built) return;
          if(pristine === false && !$picker.built) return;
          $picker.build.call($picker);
        };

        $datepicker.$updateSelected = function() {
          for(var i = 0, l = scope.rows.length; i < l; i++) {
            angular.forEach(scope.rows[i], updateSelected);
          }
        };

        $datepicker.$isSelected = function(date) {
          return $picker.isSelected(date);
        };

        $datepicker.$setDisabledEl = function(el) {
          el.disabled = $picker.isDisabled(el.date);
        };

        $datepicker.$selectPane = function(value) {
          var steps = $picker.steps;
          // set targetDate to first day of month to avoid problems with
          // date values rollover. This assumes the viewDate does not
          // depend on the day of the month
          var targetDate = new Date(Date.UTC(viewDate.year + ((steps.year || 0) * value), viewDate.month + ((steps.month || 0) * value), 1));
          angular.extend(viewDate, {year: targetDate.getUTCFullYear(), month: targetDate.getUTCMonth(), date: targetDate.getUTCDate()});
          $datepicker.$build();
        };

        $datepicker.$onMouseDown = function(evt) {
          // Prevent blur on mousedown on .dropdown-menu
          evt.preventDefault();
          evt.stopPropagation();
          // Emulate click for mobile devices
          if(isTouch) {
            var targetEl = angular.element(evt.target);
            if(targetEl[0].nodeName.toLowerCase() !== 'button') {
              targetEl = targetEl.parent();
            }
            targetEl.triggerHandler('click');
          }
        };

        $datepicker.$onKeyDown = function(evt) {
          if (!/(38|37|39|40|13)/.test(evt.keyCode) || evt.shiftKey || evt.altKey) return;
          evt.preventDefault();
          evt.stopPropagation();

          if(evt.keyCode === 13) {
            if(!scope.$mode) {
              return $datepicker.hide(true);
            } else {
              return scope.$apply(function() { $datepicker.setMode(scope.$mode - 1); });
            }
          }

          // Navigate with keyboard
          $picker.onKeyDown(evt);
          parentScope.$digest();
        };

        // Private

        function updateSelected(el) {
          el.selected = $datepicker.$isSelected(el.date);
        }

        function focusElement() {
          element[0].focus();
        }

        // Overrides

        var _init = $datepicker.init;
        $datepicker.init = function() {
          if(isNative && options.useNative) {
            element.prop('type', 'date');
            element.css('-webkit-appearance', 'textfield');
            return;
          } else if(isTouch) {
            element.prop('type', 'text');
            element.attr('readonly', 'true');
            element.on('click', focusElement);
          }
          _init();
        };

        var _destroy = $datepicker.destroy;
        $datepicker.destroy = function() {
          if(isNative && options.useNative) {
            element.off('click', focusElement);
          }
          _destroy();
        };

        var _show = $datepicker.show;
        $datepicker.show = function() {
          _show();
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            // if $datepicker is no longer showing, don't setup events
            if(!$datepicker.$isShown) return;
            $datepicker.$element.on(isTouch ? 'touchstart' : 'mousedown', $datepicker.$onMouseDown);
            if(options.keyboard) {
              element.on('keydown', $datepicker.$onKeyDown);
            }
          }, 0, false);
        };

        var _hide = $datepicker.hide;
        $datepicker.hide = function(blur) {
          if(!$datepicker.$isShown) return;
          $datepicker.$element.off(isTouch ? 'touchstart' : 'mousedown', $datepicker.$onMouseDown);
          if(options.keyboard) {
            element.off('keydown', $datepicker.$onKeyDown);
          }
          _hide(blur);
        };

        return $datepicker;

      }

      DatepickerFactory.defaults = defaults;
      return DatepickerFactory;

    }];

  })

  .directive('bsDatepicker', ["$window", "$parse", "$q", "$dateFormatter", "$dateParser", "$datepicker", function($window, $parse, $q, $dateFormatter, $dateParser, $datepicker) {

    var defaults = $datepicker.defaults;
    var isNative = /(ip(a|o)d|iphone|android)/ig.test($window.navigator.userAgent);

    return {
      restrict: 'EAC',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        // Directive options
        var options = {scope: scope, controller: controller};
        angular.forEach(['placement', 'container', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'template', 'autoclose', 'dateType', 'dateFormat', 'modelDateFormat', 'dayFormat', 'strictFormat', 'startWeek', 'startDate', 'useNative', 'lang', 'startView', 'minView', 'iconLeft', 'iconRight', 'daysOfWeekDisabled', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Visibility binding support
        attr.bsShow && scope.$watch(attr.bsShow, function(newValue, oldValue) {
          if(!datepicker || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|,?(datepicker),?/i);
          newValue === true ? datepicker.show() : datepicker.hide();
        });

        // Initialize datepicker
        var datepicker = $datepicker(element, controller, options);
        options = datepicker.$options;
        // Set expected iOS format
        if(isNative && options.useNative) options.dateFormat = 'yyyy-MM-dd';

        var lang = options.lang;

        var formatDate = function(date, format) {
          return $dateFormatter.formatDate(date, format, lang);
        };

        var dateParser = $dateParser({format: options.dateFormat, lang: lang, strict: options.strictFormat});

        // Observe attributes for changes
        angular.forEach(['minDate', 'maxDate'], function(key) {
          // console.warn('attr.$observe(%s)', key, attr[key]);
          angular.isDefined(attr[key]) && attr.$observe(key, function(newValue) {
            // console.warn('attr.$observe(%s)=%o', key, newValue);
            datepicker.$options[key] = dateParser.getDateForAttribute(key, newValue);
            // Build only if dirty
            !isNaN(datepicker.$options[key]) && datepicker.$build(false);
            validateAgainstMinMaxDate(controller.$dateValue);
          });
        });

        // Watch model for changes
        scope.$watch(attr.ngModel, function(newValue, oldValue) {
          datepicker.update(controller.$dateValue);
        }, true);

        // Normalize undefined/null/empty array,
        // so that we don't treat changing from undefined->null as a change.
        function normalizeDateRanges(ranges) {
          if (!ranges || !ranges.length) return null;
          return ranges;
        }

        if (angular.isDefined(attr.disabledDates)) {
          scope.$watch(attr.disabledDates, function(disabledRanges, previousValue) {
            disabledRanges = normalizeDateRanges(disabledRanges);
            previousValue = normalizeDateRanges(previousValue);

            if (disabledRanges) {
              datepicker.updateDisabledDates(disabledRanges);
            }
          });
        }

        function validateAgainstMinMaxDate(parsedDate) {
          if (!angular.isDate(parsedDate)) return;
          var isMinValid = isNaN(datepicker.$options.minDate) || parsedDate.getTime() >= datepicker.$options.minDate;
          var isMaxValid = isNaN(datepicker.$options.maxDate) || parsedDate.getTime() <= datepicker.$options.maxDate;
          var isValid = isMinValid && isMaxValid;
          controller.$setValidity('date', isValid);
          controller.$setValidity('min', isMinValid);
          controller.$setValidity('max', isMaxValid);
          // Only update the model when we have a valid date
          if(isValid) controller.$dateValue = parsedDate;
        }

        // viewValue -> $parsers -> modelValue
        controller.$parsers.unshift(function(viewValue) {
          // console.warn('$parser("%s"): viewValue=%o', element.attr('ng-model'), viewValue);
          // Null values should correctly reset the model value & validity
          if(!viewValue) {
            controller.$setValidity('date', true);
            // BREAKING CHANGE:
            // return null (not undefined) when input value is empty, so angularjs 1.3
            // ngModelController can go ahead and run validators, like ngRequired
            return null;
          }
          var parsedDate = dateParser.parse(viewValue, controller.$dateValue);
          if(!parsedDate || isNaN(parsedDate.getTime())) {
            controller.$setValidity('date', false);
            // return undefined, causes ngModelController to
            // invalidate model value
            return;
          } else {
            validateAgainstMinMaxDate(parsedDate);
          }
          if(options.dateType === 'string') {
            return formatDate(parsedDate, options.modelDateFormat || options.dateFormat);
          } else if(options.dateType === 'number') {
            return controller.$dateValue.getTime();
          } else if(options.dateType === 'unix') {
            return controller.$dateValue.getTime() / 1000;
          } else if(options.dateType === 'iso') {
            return controller.$dateValue.toISOString();
          } else {
            return new Date(controller.$dateValue);
          }
        });

        // modelValue -> $formatters -> viewValue
        controller.$formatters.push(function(modelValue) {
          // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
          var date;
          if(angular.isUndefined(modelValue) || modelValue === null) {
            date = NaN;
          } else if(angular.isDate(modelValue)) {
            date = modelValue;
          } else if(options.dateType === 'string') {
            date = dateParser.parse(modelValue, null, options.modelDateFormat);
          } else if(options.dateType === 'unix') {
            date = new Date(modelValue * 1000);
          } else {
            date = new Date(modelValue);
          }
          // Setup default value?
          // if(isNaN(date.getTime())) {
          //   var today = new Date();
          //   date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
          // }
          controller.$dateValue = date;
          return getDateFormattedString();
        });

        // viewValue -> element
        controller.$render = function() {
          // console.warn('$render("%s"): viewValue=%o', element.attr('ng-model'), controller.$viewValue);
          element.val(getDateFormattedString());
        };

        function getDateFormattedString() {
          return !controller.$dateValue || isNaN(controller.$dateValue.getTime()) ? '' : formatDate(controller.$dateValue, options.dateFormat);
        }

        // Garbage collection
        scope.$on('$destroy', function() {
          if(datepicker) datepicker.destroy();
          options = null;
          datepicker = null;
        });

      }
    };

  }])

  .provider('datepickerViews', function() {

    var defaults = this.defaults = {
      dayFormat: 'dd',
      daySplit: 7
    };

    // Split array into smaller arrays
    function split(arr, size) {
      var arrays = [];
      while(arr.length > 0) {
        arrays.push(arr.splice(0, size));
      }
      return arrays;
    }

    // Modulus operator
    function mod(n, m) {
      return ((n % m) + m) % m;
    }

    this.$get = ["$dateFormatter", "$dateParser", "$sce", function($dateFormatter, $dateParser, $sce) {

      return function(picker) {

        var scope = picker.$scope;
        var options = picker.$options;

        var lang = options.lang;
        var formatDate = function(date, format) {
          return $dateFormatter.formatDate(date, format, lang);
        };
        var dateParser = $dateParser({format: options.dateFormat, lang: lang, strict: options.strictFormat});

        var weekDaysMin = $dateFormatter.weekdaysShort(lang);
        var weekDaysLabels = weekDaysMin.slice(options.startWeek).concat(weekDaysMin.slice(0, options.startWeek));
        var weekDaysLabelsHtml = $sce.trustAsHtml('<th class="dow text-center">' + weekDaysLabels.join('</th><th class="dow text-center">') + '</th>');

        var startDate = picker.$date || (options.startDate ? dateParser.getDateForAttribute('startDate', options.startDate) : new Date());
        var viewDate = {year: startDate.getFullYear(), month: startDate.getMonth(), date: startDate.getDate()};
        var timezoneOffset = startDate.getTimezoneOffset() * 6e4;

        var views = [{
            format: options.dayFormat,
            split: 7,
            steps: { month: 1 },
            update: function(date, force) {
              if(!this.built || force || date.getFullYear() !== viewDate.year || date.getMonth() !== viewDate.month) {
                angular.extend(viewDate, {year: picker.$date.getFullYear(), month: picker.$date.getMonth(), date: picker.$date.getDate()});
                picker.$build();
              } else if(date.getDate() !== viewDate.date) {
                viewDate.date = picker.$date.getDate();
                picker.$updateSelected();
              }
            },
            build: function() {
              var firstDayOfMonth = new Date(viewDate.year, viewDate.month, 1), firstDayOfMonthOffset = firstDayOfMonth.getTimezoneOffset();
              var firstDate = new Date(+firstDayOfMonth - mod(firstDayOfMonth.getDay() - options.startWeek, 7) * 864e5), firstDateOffset = firstDate.getTimezoneOffset();
              var today = new Date().toDateString();
              // Handle daylight time switch
              if(firstDateOffset !== firstDayOfMonthOffset) firstDate = new Date(+firstDate + (firstDateOffset - firstDayOfMonthOffset) * 60e3);
              var days = [], day;
              for(var i = 0; i < 42; i++) { // < 7 * 6
                day = dateParser.daylightSavingAdjust(new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() + i));
                days.push({date: day, isToday: day.toDateString() === today, label: formatDate(day, this.format), selected: picker.$date && this.isSelected(day), muted: day.getMonth() !== viewDate.month, disabled: this.isDisabled(day)});
              }
              scope.title = formatDate(firstDayOfMonth, options.monthTitleFormat);
              scope.showLabels = true;
              scope.labels = weekDaysLabelsHtml;
              scope.rows = split(days, this.split);
              this.built = true;
            },
            isSelected: function(date) {
              return picker.$date && date.getFullYear() === picker.$date.getFullYear() && date.getMonth() === picker.$date.getMonth() && date.getDate() === picker.$date.getDate();
            },
            isDisabled: function(date) {
              var time = date.getTime();

              // Disabled because of min/max date.
              if (time < options.minDate || time > options.maxDate) return true;

              // Disabled due to being a disabled day of the week
              if (options.daysOfWeekDisabled.indexOf(date.getDay()) !== -1) return true;

              // Disabled because of disabled date range.
              if (options.disabledDateRanges) {
                for (var i = 0; i < options.disabledDateRanges.length; i++) {
                  if (time >= options.disabledDateRanges[i].start && time <= options.disabledDateRanges[i].end) {
                    return true;
                  }
                }
              }

              return false;
            },
            onKeyDown: function(evt) {
              if (!picker.$date) {
                return;
              }
              var actualTime = picker.$date.getTime();
              var newDate;

              if(evt.keyCode === 37) newDate = new Date(actualTime - 1 * 864e5);
              else if(evt.keyCode === 38) newDate = new Date(actualTime - 7 * 864e5);
              else if(evt.keyCode === 39) newDate = new Date(actualTime + 1 * 864e5);
              else if(evt.keyCode === 40) newDate = new Date(actualTime + 7 * 864e5);

              if (!this.isDisabled(newDate)) picker.select(newDate, true);
            }
          }, {
            name: 'month',
            format: options.monthFormat,
            split: 4,
            steps: { year: 1 },
            update: function(date, force) {
              if(!this.built || date.getFullYear() !== viewDate.year) {
                angular.extend(viewDate, {year: picker.$date.getFullYear(), month: picker.$date.getMonth(), date: picker.$date.getDate()});
                picker.$build();
              } else if(date.getMonth() !== viewDate.month) {
                angular.extend(viewDate, {month: picker.$date.getMonth(), date: picker.$date.getDate()});
                picker.$updateSelected();
              }
            },
            build: function() {
              var firstMonth = new Date(viewDate.year, 0, 1);
              var months = [], month;
              for (var i = 0; i < 12; i++) {
                month = new Date(viewDate.year, i, 1);
                months.push({date: month, label: formatDate(month, this.format), selected: picker.$isSelected(month), disabled: this.isDisabled(month)});
              }
              scope.title = formatDate(month, options.yearTitleFormat);
              scope.showLabels = false;
              scope.rows = split(months, this.split);
              this.built = true;
            },
            isSelected: function(date) {
              return picker.$date && date.getFullYear() === picker.$date.getFullYear() && date.getMonth() === picker.$date.getMonth();
            },
            isDisabled: function(date) {
              var lastDate = +new Date(date.getFullYear(), date.getMonth() + 1, 0);
              return lastDate < options.minDate || date.getTime() > options.maxDate;
            },
            onKeyDown: function(evt) {
              if (!picker.$date) {
                return;
              }
              var actualMonth = picker.$date.getMonth();
              var newDate = new Date(picker.$date);

              if(evt.keyCode === 37) newDate.setMonth(actualMonth - 1);
              else if(evt.keyCode === 38) newDate.setMonth(actualMonth - 4);
              else if(evt.keyCode === 39) newDate.setMonth(actualMonth + 1);
              else if(evt.keyCode === 40) newDate.setMonth(actualMonth + 4);

              if (!this.isDisabled(newDate)) picker.select(newDate, true);
            }
          }, {
            name: 'year',
            format: options.yearFormat,
            split: 4,
            steps: { year: 12 },
            update: function(date, force) {
              if(!this.built || force || parseInt(date.getFullYear()/20, 10) !== parseInt(viewDate.year/20, 10)) {
                angular.extend(viewDate, {year: picker.$date.getFullYear(), month: picker.$date.getMonth(), date: picker.$date.getDate()});
                picker.$build();
              } else if(date.getFullYear() !== viewDate.year) {
                angular.extend(viewDate, {year: picker.$date.getFullYear(), month: picker.$date.getMonth(), date: picker.$date.getDate()});
                picker.$updateSelected();
              }
            },
            build: function() {
              var firstYear = viewDate.year - viewDate.year % (this.split * 3);
              var years = [], year;
              for (var i = 0; i < 12; i++) {
                year = new Date(firstYear + i, 0, 1);
                years.push({date: year, label: formatDate(year, this.format), selected: picker.$isSelected(year), disabled: this.isDisabled(year)});
              }
              scope.title = years[0].label + '-' + years[years.length - 1].label;
              scope.showLabels = false;
              scope.rows = split(years, this.split);
              this.built = true;
            },
            isSelected: function(date) {
              return picker.$date && date.getFullYear() === picker.$date.getFullYear();
            },
            isDisabled: function(date) {
              var lastDate = +new Date(date.getFullYear() + 1, 0, 0);
              return lastDate < options.minDate || date.getTime() > options.maxDate;
            },
            onKeyDown: function(evt) {
              if (!picker.$date) {
                return;
              }
              var actualYear = picker.$date.getFullYear(),
                  newDate = new Date(picker.$date);

              if(evt.keyCode === 37) newDate.setYear(actualYear - 1);
              else if(evt.keyCode === 38) newDate.setYear(actualYear - 4);
              else if(evt.keyCode === 39) newDate.setYear(actualYear + 1);
              else if(evt.keyCode === 40) newDate.setYear(actualYear + 4);

              if (!this.isDisabled(newDate)) picker.select(newDate, true);
            }
          }];

        return {
          views: options.minView ? Array.prototype.slice.call(views, options.minView) : views,
          viewDate: viewDate
        };

      };

    }];

  });

// Source: dropdown.js
angular.module('mgcrea.ngStrap.dropdown', ['mgcrea.ngStrap.tooltip'])

  .provider('$dropdown', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'dropdown',
      placement: 'bottom-left',
      template: 'dropdown/dropdown.tpl.html',
      trigger: 'click',
      container: false,
      keyboard: true,
      html: false,
      delay: 0
    };

    this.$get = ["$window", "$rootScope", "$tooltip", "$timeout", function($window, $rootScope, $tooltip, $timeout) {

      var bodyEl = angular.element($window.document.body);
      var matchesSelector = Element.prototype.matchesSelector || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector;

      function DropdownFactory(element, config) {

        var $dropdown = {};

        // Common vars
        var options = angular.extend({}, defaults, config);
        var scope = $dropdown.$scope = options.scope && options.scope.$new() || $rootScope.$new();

        $dropdown = $tooltip(element, options);
        var parentEl = element.parent();

        // Protected methods

        $dropdown.$onKeyDown = function(evt) {
          if (!/(38|40)/.test(evt.keyCode)) return;
          evt.preventDefault();
          evt.stopPropagation();

          // Retrieve focused index
          var items = angular.element($dropdown.$element[0].querySelectorAll('li:not(.divider) a'));
          if(!items.length) return;
          var index;
          angular.forEach(items, function(el, i) {
            if(matchesSelector && matchesSelector.call(el, ':focus')) index = i;
          });

          // Navigate with keyboard
          if(evt.keyCode === 38 && index > 0) index--;
          else if(evt.keyCode === 40 && index < items.length - 1) index++;
          else if(angular.isUndefined(index)) index = 0;
          items.eq(index)[0].focus();

        };

        // Overrides

        var show = $dropdown.show;
        $dropdown.show = function() {
          show();
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            options.keyboard && $dropdown.$element.on('keydown', $dropdown.$onKeyDown);
            bodyEl.on('click', onBodyClick);
          }, 0, false);
          parentEl.hasClass('dropdown') && parentEl.addClass('open');
        };

        var hide = $dropdown.hide;
        $dropdown.hide = function() {
          if(!$dropdown.$isShown) return;
          options.keyboard && $dropdown.$element.off('keydown', $dropdown.$onKeyDown);
          bodyEl.off('click', onBodyClick);
          parentEl.hasClass('dropdown') && parentEl.removeClass('open');
          hide();
        };

        var destroy = $dropdown.destroy;
        $dropdown.destroy = function() {
          bodyEl.off('click', onBodyClick);
          destroy();
        };

        // Private functions

        function onBodyClick(evt) {
          if(evt.target === element[0]) return;
          return evt.target !== element[0] && $dropdown.hide();
        }

        return $dropdown;

      }

      return DropdownFactory;

    }];

  })

  .directive('bsDropdown', ["$window", "$sce", "$dropdown", function($window, $sce, $dropdown) {

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {

        // Directive options
        var options = {scope: scope};
        angular.forEach(['placement', 'container', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'template', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as an object
        attr.bsDropdown && scope.$watch(attr.bsDropdown, function(newValue, oldValue) {
          scope.content = newValue;
        }, true);

        // Visibility binding support
        attr.bsShow && scope.$watch(attr.bsShow, function(newValue, oldValue) {
          if(!dropdown || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|,?(dropdown),?/i);
          newValue === true ? dropdown.show() : dropdown.hide();
        });

        // Initialize dropdown
        var dropdown = $dropdown(element, options);

        // Garbage collection
        scope.$on('$destroy', function() {
          if (dropdown) dropdown.destroy();
          options = null;
          dropdown = null;
        });

      }
    };

  }]);

// Source: date-formatter.js
angular.module('mgcrea.ngStrap.helpers.dateFormatter', [])

  .service('$dateFormatter', ["$locale", "dateFilter", function($locale, dateFilter) {

    // The unused `lang` arguments are on purpose. The default implementation does not
    // use them and it always uses the locale loaded into the `$locale` service.
    // Custom implementations might use it, thus allowing different directives to
    // have different languages.

    this.getDefaultLocale = function() {
      return $locale.id;
    };

    // Format is either a data format name, e.g. "shortTime" or "fullDate", or a date format
    // Return either the corresponding date format or the given date format.
    this.getDatetimeFormat = function(format, lang) {
      return $locale.DATETIME_FORMATS[format] || format;
    };

    this.weekdaysShort = function(lang) {
      return $locale.DATETIME_FORMATS.SHORTDAY;
    };

    function splitTimeFormat(format) {
      return /(h+)([:\.])?(m+)[ ]?(a?)/i.exec(format).slice(1);
    }

    // h:mm a => h
    this.hoursFormat = function(timeFormat) {
      return splitTimeFormat(timeFormat)[0];
    };

    // h:mm a => mm
    this.minutesFormat = function(timeFormat) {
      return splitTimeFormat(timeFormat)[2];
    };

    // h:mm a => :
    this.timeSeparator = function(timeFormat) {
      return splitTimeFormat(timeFormat)[1];
    };

    // h:mm a => true, H.mm => false
    this.showAM = function(timeFormat) {
      return !!splitTimeFormat(timeFormat)[3];
    };

    this.formatDate = function(date, format, lang){
      return dateFilter(date, format);
    };

  }]);

// Source: date-parser.js
angular.module('mgcrea.ngStrap.helpers.dateParser', [])

.provider('$dateParser', ["$localeProvider", function($localeProvider) {

  // define a custom ParseDate object to use instead of native Date
  // to avoid date values wrapping when setting date component values
  function ParseDate() {
    this.year = 1970;
    this.month = 0;
    this.day = 1;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.milliseconds = 0;
  }

  ParseDate.prototype.setMilliseconds = function(value) { this.milliseconds = value; };
  ParseDate.prototype.setSeconds = function(value) { this.seconds = value; };
  ParseDate.prototype.setMinutes = function(value) { this.minutes = value; };
  ParseDate.prototype.setHours = function(value) { this.hours = value; };
  ParseDate.prototype.getHours = function() { return this.hours; };
  ParseDate.prototype.setDate = function(value) { this.day = value; };
  ParseDate.prototype.setMonth = function(value) { this.month = value; };
  ParseDate.prototype.setFullYear = function(value) { this.year = value; };
  ParseDate.prototype.fromDate = function(value) {
    this.year = value.getFullYear();
    this.month = value.getMonth();
    this.day = value.getDate();
    this.hours = value.getHours();
    this.minutes = value.getMinutes();
    this.seconds = value.getSeconds();
    this.milliseconds = value.getMilliseconds();
    return this;
  };

  ParseDate.prototype.toDate = function() {
    return new Date(this.year, this.month, this.day, this.hours, this.minutes, this.seconds, this.milliseconds);
  };

  var proto = ParseDate.prototype;

  function noop() {
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function indexOfCaseInsensitive(array, value) {
    var len = array.length, str=value.toString().toLowerCase();
    for (var i=0; i<len; i++) {
      if (array[i].toLowerCase() === str) { return i; }
    }
    return -1; // Return -1 per the "Array.indexOf()" method.
  }

  var defaults = this.defaults = {
    format: 'shortDate',
    strict: false
  };

  this.$get = ["$locale", "dateFilter", function($locale, dateFilter) {

    var DateParserFactory = function(config) {

      var options = angular.extend({}, defaults, config);

      var $dateParser = {};

      var regExpMap = {
        'sss'   : '[0-9]{3}',
        'ss'    : '[0-5][0-9]',
        's'     : options.strict ? '[1-5]?[0-9]' : '[0-9]|[0-5][0-9]',
        'mm'    : '[0-5][0-9]',
        'm'     : options.strict ? '[1-5]?[0-9]' : '[0-9]|[0-5][0-9]',
        'HH'    : '[01][0-9]|2[0-3]',
        'H'     : options.strict ? '1?[0-9]|2[0-3]' : '[01]?[0-9]|2[0-3]',
        'hh'    : '[0][1-9]|[1][012]',
        'h'     : options.strict ? '[1-9]|1[012]' : '0?[1-9]|1[012]',
        'a'     : 'AM|PM',
        'EEEE'  : $locale.DATETIME_FORMATS.DAY.join('|'),
        'EEE'   : $locale.DATETIME_FORMATS.SHORTDAY.join('|'),
        'dd'    : '0[1-9]|[12][0-9]|3[01]',
        'd'     : options.strict ? '[1-9]|[1-2][0-9]|3[01]' : '0?[1-9]|[1-2][0-9]|3[01]',
        'MMMM'  : $locale.DATETIME_FORMATS.MONTH.join('|'),
        'MMM'   : $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
        'MM'    : '0[1-9]|1[012]',
        'M'     : options.strict ? '[1-9]|1[012]' : '0?[1-9]|1[012]',
        'yyyy'  : '[1]{1}[0-9]{3}|[2]{1}[0-9]{3}',
        'yy'    : '[0-9]{2}',
        'y'     : options.strict ? '-?(0|[1-9][0-9]{0,3})' : '-?0*[0-9]{1,4}',
      };

      var setFnMap = {
        'sss'   : proto.setMilliseconds,
        'ss'    : proto.setSeconds,
        's'     : proto.setSeconds,
        'mm'    : proto.setMinutes,
        'm'     : proto.setMinutes,
        'HH'    : proto.setHours,
        'H'     : proto.setHours,
        'hh'    : proto.setHours,
        'h'     : proto.setHours,
        'EEEE'  : noop,
        'EEE'   : noop,
        'dd'    : proto.setDate,
        'd'     : proto.setDate,
        'a'     : function(value) { var hours = this.getHours() % 12; return this.setHours(value.match(/pm/i) ? hours + 12 : hours); },
        'MMMM'  : function(value) { return this.setMonth(indexOfCaseInsensitive($locale.DATETIME_FORMATS.MONTH, value)); },
        'MMM'   : function(value) { return this.setMonth(indexOfCaseInsensitive($locale.DATETIME_FORMATS.SHORTMONTH, value)); },
        'MM'    : function(value) { return this.setMonth(1 * value - 1); },
        'M'     : function(value) { return this.setMonth(1 * value - 1); },
        'yyyy'  : proto.setFullYear,
        'yy'    : function(value) { return this.setFullYear(2000 + 1 * value); },
        'y'     : proto.setFullYear
      };

      var regex, setMap;

      $dateParser.init = function() {
        $dateParser.$format = $locale.DATETIME_FORMATS[options.format] || options.format;
        regex = regExpForFormat($dateParser.$format);
        setMap = setMapForFormat($dateParser.$format);
      };

      $dateParser.isValid = function(date) {
        if(angular.isDate(date)) return !isNaN(date.getTime());
        return regex.test(date);
      };

      $dateParser.parse = function(value, baseDate, format) {
        // check for date format special names
        if(format) format = $locale.DATETIME_FORMATS[format] || format;
        if(angular.isDate(value)) value = dateFilter(value, format || $dateParser.$format);
        var formatRegex = format ? regExpForFormat(format) : regex;
        var formatSetMap = format ? setMapForFormat(format) : setMap;
        var matches = formatRegex.exec(value);
        if(!matches) return false;
        // use custom ParseDate object to set parsed values
        var date = baseDate && !isNaN(baseDate.getTime()) ? new ParseDate().fromDate(baseDate) : new ParseDate().fromDate(new Date(1970, 0, 1, 0));
        for(var i = 0; i < matches.length - 1; i++) {
          formatSetMap[i] && formatSetMap[i].call(date, matches[i+1]);
        }
        // convert back to native Date object
        var newDate = date.toDate();

        // check new native Date object for day values overflow
        if (parseInt(date.day, 10) !== newDate.getDate()) {
          return false;
        }

        return newDate;
      };

      $dateParser.getDateForAttribute = function(key, value) {
        var date;

        if(value === 'today') {
          var today = new Date();
          date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (key === 'maxDate' ? 1 : 0), 0, 0, 0, (key === 'minDate' ? 0 : -1));
        } else if(angular.isString(value) && value.match(/^".+"$/)) { // Support {{ dateObj }}
          date = new Date(value.substr(1, value.length - 2));
        } else if(isNumeric(value)) {
          date = new Date(parseInt(value, 10));
        } else if (angular.isString(value) && 0 === value.length) { // Reset date
          date = key === 'minDate' ? -Infinity : +Infinity;
        } else {
          date = new Date(value);
        }

        return date;
      };

      $dateParser.getTimeForAttribute = function(key, value) {
        var time;

        if(value === 'now') {
          time = new Date().setFullYear(1970, 0, 1);
        } else if(angular.isString(value) && value.match(/^".+"$/)) {
          time = new Date(value.substr(1, value.length - 2)).setFullYear(1970, 0, 1);
        } else if(isNumeric(value)) {
          time = new Date(parseInt(value, 10)).setFullYear(1970, 0, 1);
        } else if (angular.isString(value) && 0 === value.length) { // Reset time
          time = key === 'minTime' ? -Infinity : +Infinity;
        } else {
          time = $dateParser.parse(value, new Date(1970, 0, 1, 0));
        }

        return time;
      };

      /* Handle switch to/from daylight saving.
      * Hours may be non-zero on daylight saving cut-over:
      * > 12 when midnight changeover, but then cannot generate
      * midnight datetime, so jump to 1AM, otherwise reset.
      * @param  date  (Date) the date to check
      * @return  (Date) the corrected date
      *
      * __ copied from jquery ui datepicker __
      */
      $dateParser.daylightSavingAdjust = function(date) {
        if (!date) {
          return null;
        }
        date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
        return date;
      };

      // Private functions

      function setMapForFormat(format) {
        var keys = Object.keys(setFnMap), i;
        var map = [], sortedMap = [];
        // Map to setFn
        var clonedFormat = format;
        for(i = 0; i < keys.length; i++) {
          if(format.split(keys[i]).length > 1) {
            var index = clonedFormat.search(keys[i]);
            format = format.split(keys[i]).join('');
            if(setFnMap[keys[i]]) {
              map[index] = setFnMap[keys[i]];
            }
          }
        }
        // Sort result map
        angular.forEach(map, function(v) {
          // conditional required since angular.forEach broke around v1.2.21
          // related pr: https://github.com/angular/angular.js/pull/8525
          if(v) sortedMap.push(v);
        });
        return sortedMap;
      }

      function escapeReservedSymbols(text) {
        return text.replace(/\//g, '[\\/]').replace('/-/g', '[-]').replace(/\./g, '[.]').replace(/\\s/g, '[\\s]');
      }

      function regExpForFormat(format) {
        var keys = Object.keys(regExpMap), i;

        var re = format;
        // Abstract replaces to avoid collisions
        for(i = 0; i < keys.length; i++) {
          re = re.split(keys[i]).join('${' + i + '}');
        }
        // Replace abstracted values
        for(i = 0; i < keys.length; i++) {
          re = re.split('${' + i + '}').join('(' + regExpMap[keys[i]] + ')');
        }
        format = escapeReservedSymbols(format);

        return new RegExp('^' + re + '$', ['i']);
      }

      $dateParser.init();
      return $dateParser;

    };

    return DateParserFactory;

  }];

}]);

// Source: debounce.js
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

// Source: dimensions.js
angular.module('mgcrea.ngStrap.helpers.dimensions', [])

  .factory('dimensions', ["$document", "$window", function($document, $window) {

    var jqLite = angular.element;
    var fn = {};

    /**
     * Test the element nodeName
     * @param element
     * @param name
     */
    var nodeName = fn.nodeName = function(element, name) {
      return element.nodeName && element.nodeName.toLowerCase() === name.toLowerCase();
    };

    /**
     * Returns the element computed style
     * @param element
     * @param prop
     * @param extra
     */
    fn.css = function(element, prop, extra) {
      var value;
      if (element.currentStyle) { //IE
        value = element.currentStyle[prop];
      } else if (window.getComputedStyle) {
        value = window.getComputedStyle(element)[prop];
      } else {
        value = element.style[prop];
      }
      return extra === true ? parseFloat(value) || 0 : value;
    };

    /**
     * Provides read-only equivalent of jQuery's offset function:
     * @required-by bootstrap-tooltip, bootstrap-affix
     * @url http://api.jquery.com/offset/
     * @param element
     */
    fn.offset = function(element) {
      var boxRect = element.getBoundingClientRect();
      var docElement = element.ownerDocument;
      return {
        width: boxRect.width || element.offsetWidth,
        height: boxRect.height || element.offsetHeight,
        top: boxRect.top + (window.pageYOffset || docElement.documentElement.scrollTop) - (docElement.documentElement.clientTop || 0),
        left: boxRect.left + (window.pageXOffset || docElement.documentElement.scrollLeft) - (docElement.documentElement.clientLeft || 0)
      };
    };

    /**
     * Provides read-only equivalent of jQuery's position function
     * @required-by bootstrap-tooltip, bootstrap-affix
     * @url http://api.jquery.com/offset/
     * @param element
     */
    fn.position = function(element) {

      var offsetParentRect = {top: 0, left: 0},
          offsetParentElement,
          offset;

      // Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is it's only offset parent
      if (fn.css(element, 'position') === 'fixed') {

        // We assume that getBoundingClientRect is available when computed position is fixed
        offset = element.getBoundingClientRect();

      } else {

        // Get *real* offsetParentElement
        offsetParentElement = offsetParent(element);

        // Get correct offsets
        offset = fn.offset(element);
        if (!nodeName(offsetParentElement, 'html')) {
          offsetParentRect = fn.offset(offsetParentElement);
        }

        // Add offsetParent borders
        offsetParentRect.top += fn.css(offsetParentElement, 'borderTopWidth', true);
        offsetParentRect.left += fn.css(offsetParentElement, 'borderLeftWidth', true);
      }

      // Subtract parent offsets and element margins
      return {
        width: element.offsetWidth,
        height: element.offsetHeight,
        top: offset.top - offsetParentRect.top - fn.css(element, 'marginTop', true),
        left: offset.left - offsetParentRect.left - fn.css(element, 'marginLeft', true)
      };

    };

    /**
     * Returns the closest, non-statically positioned offsetParent of a given element
     * @required-by fn.position
     * @param element
     */
    var offsetParent = function offsetParentElement(element) {
      var docElement = element.ownerDocument;
      var offsetParent = element.offsetParent || docElement;
      if(nodeName(offsetParent, '#document')) return docElement.documentElement;
      while(offsetParent && !nodeName(offsetParent, 'html') && fn.css(offsetParent, 'position') === 'static') {
        offsetParent = offsetParent.offsetParent;
      }
      return offsetParent || docElement.documentElement;
    };

    /**
     * Provides equivalent of jQuery's height function
     * @required-by bootstrap-affix
     * @url http://api.jquery.com/height/
     * @param element
     * @param outer
     */
    fn.height = function(element, outer) {
      var value = element.offsetHeight;
      if(outer) {
        value += fn.css(element, 'marginTop', true) + fn.css(element, 'marginBottom', true);
      } else {
        value -= fn.css(element, 'paddingTop', true) + fn.css(element, 'paddingBottom', true) + fn.css(element, 'borderTopWidth', true) + fn.css(element, 'borderBottomWidth', true);
      }
      return value;
    };

    /**
     * Provides equivalent of jQuery's width function
     * @required-by bootstrap-affix
     * @url http://api.jquery.com/width/
     * @param element
     * @param outer
     */
    fn.width = function(element, outer) {
      var value = element.offsetWidth;
      if(outer) {
        value += fn.css(element, 'marginLeft', true) + fn.css(element, 'marginRight', true);
      } else {
        value -= fn.css(element, 'paddingLeft', true) + fn.css(element, 'paddingRight', true) + fn.css(element, 'borderLeftWidth', true) + fn.css(element, 'borderRightWidth', true);
      }
      return value;
    };

    return fn;

  }]);

// Source: parse-options.js
angular.module('mgcrea.ngStrap.helpers.parseOptions', [])

  .provider('$parseOptions', function() {

    var defaults = this.defaults = {
      regexp: /^\s*(.*?)(?:\s+as\s+(.*?))?(?:\s+group\s+by\s+(.*))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(.*?)(?:\s+track\s+by\s+(.*?))?$/
    };

    this.$get = ["$parse", "$q", function($parse, $q) {

      function ParseOptionsFactory(attr, config) {

        var $parseOptions = {};

        // Common vars
        var options = angular.extend({}, defaults, config);
        $parseOptions.$values = [];

        // Private vars
        var match, displayFn, valueName, keyName, groupByFn, valueFn, valuesFn;

        $parseOptions.init = function() {
          $parseOptions.$match = match = attr.match(options.regexp);
          displayFn = $parse(match[2] || match[1]),
          valueName = match[4] || match[6],
          keyName = match[5],
          groupByFn = $parse(match[3] || ''),
          valueFn = $parse(match[2] ? match[1] : valueName),
          valuesFn = $parse(match[7]);
        };

        $parseOptions.valuesFn = function(scope, controller) {
          return $q.when(valuesFn(scope, controller))
          .then(function(values) {
            $parseOptions.$values = values ? parseValues(values, scope) : {};
            return $parseOptions.$values;
          });
        };

        $parseOptions.displayValue = function(modelValue) {
          var scope = {};
          scope[valueName] = modelValue;
          return displayFn(scope);
        };

        // Private functions

        function parseValues(values, scope) {
          return values.map(function(match, index) {
            var locals = {}, label, value;
            locals[valueName] = match;
            label = displayFn(scope, locals);
            value = valueFn(scope, locals);
            return {label: label, value: value, index: index};
          });
        }

        $parseOptions.init();
        return $parseOptions;

      }

      return ParseOptionsFactory;

    }];

  });

// Source: raf.js
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

// Source: modal.js
angular.module('mgcrea.ngStrap.modal', ['mgcrea.ngStrap.helpers.dimensions'])

  .provider('$modal', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      backdropAnimation: 'am-fade',
      prefixClass: 'modal',
      prefixEvent: 'modal',
      placement: 'top',
      template: 'modal/modal.tpl.html',
      contentTemplate: false,
      container: false,
      element: null,
      backdrop: true,
      keyboard: true,
      html: false,
      show: true
    };

    this.$get = ["$window", "$rootScope", "$compile", "$q", "$templateCache", "$http", "$animate", "$timeout", "$sce", "dimensions", function($window, $rootScope, $compile, $q, $templateCache, $http, $animate, $timeout, $sce, dimensions) {

      var forEach = angular.forEach;
      var trim = String.prototype.trim;
      var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;
      var bodyElement = angular.element($window.document.body);
      var htmlReplaceRegExp = /ng-bind="/ig;

      function ModalFactory(config) {

        var $modal = {};

        // Common vars
        var options = $modal.$options = angular.extend({}, defaults, config);
        $modal.$promise = fetchTemplate(options.template);
        var scope = $modal.$scope = options.scope && options.scope.$new() || $rootScope.$new();
        if(!options.element && !options.container) {
          options.container = 'body';
        }

        // store $id to identify the triggering element in events
        // give priority to options.id, otherwise, try to use
        // element id if defined
        $modal.$id = options.id || options.element && options.element.attr('id') || '';

        // Support scope as string options
        forEach(['title', 'content'], function(key) {
          if(options[key]) scope[key] = $sce.trustAsHtml(options[key]);
        });

        // Provide scope helpers
        scope.$hide = function() {
          scope.$$postDigest(function() {
            $modal.hide();
          });
        };
        scope.$show = function() {
          scope.$$postDigest(function() {
            $modal.show();
          });
        };
        scope.$toggle = function() {
          scope.$$postDigest(function() {
            $modal.toggle();
          });
        };
        // Publish isShown as a protected var on scope
        $modal.$isShown = scope.$isShown = false;

        // Support contentTemplate option
        if(options.contentTemplate) {
          $modal.$promise = $modal.$promise.then(function(template) {
            var templateEl = angular.element(template);
            return fetchTemplate(options.contentTemplate)
            .then(function(contentTemplate) {
              var contentEl = findElement('[ng-bind="content"]', templateEl[0]).removeAttr('ng-bind').html(contentTemplate);
              // Drop the default footer as you probably don't want it if you use a custom contentTemplate
              if(!config.template) contentEl.next().remove();
              return templateEl[0].outerHTML;
            });
          });
        }

        // Fetch, compile then initialize modal
        var modalLinker, modalElement;
        var backdropElement = angular.element('<div class="' + options.prefixClass + '-backdrop"/>');
        $modal.$promise.then(function(template) {
          if(angular.isObject(template)) template = template.data;
          if(options.html) template = template.replace(htmlReplaceRegExp, 'ng-bind-html="');
          template = trim.apply(template);
          modalLinker = $compile(template);
          $modal.init();
        });

        $modal.init = function() {

          // Options: show
          if(options.show) {
            scope.$$postDigest(function() {
              $modal.show();
            });
          }

        };

        $modal.destroy = function() {

          // Remove element
          if(modalElement) {
            modalElement.remove();
            modalElement = null;
          }
          if(backdropElement) {
            backdropElement.remove();
            backdropElement = null;
          }

          // Destroy scope
          scope.$destroy();

        };

        $modal.show = function() {
          if($modal.$isShown) return;

          if(scope.$emit(options.prefixEvent + '.show.before', $modal).defaultPrevented) {
            return;
          }
          var parent, after;
          if(angular.isElement(options.container)) {
            parent = options.container;
            after = options.container[0].lastChild ? angular.element(options.container[0].lastChild) : null;
          } else {
            if (options.container) {
              parent = findElement(options.container);
              after = parent[0].lastChild ? angular.element(parent[0].lastChild) : null;
            } else {
              parent = null;
              after = options.element;
            }
          }

          // Fetch a cloned element linked from template
          modalElement = $modal.$element = modalLinker(scope, function(clonedElement, scope) {});

          // Set the initial positioning.
          modalElement.css({display: 'block'}).addClass(options.placement);

          // Options: animation
          if(options.animation) {
            if(options.backdrop) {
              backdropElement.addClass(options.backdropAnimation);
            }
            modalElement.addClass(options.animation);
          }

          if(options.backdrop) {
            $animate.enter(backdropElement, bodyElement, null);
          }
          // Support v1.3+ $animate
          // https://github.com/angular/angular.js/commit/bf0f5502b1bbfddc5cdd2f138efd9188b8c652a9
          var promise = $animate.enter(modalElement, parent, after, enterAnimateCallback);
          if(promise && promise.then) promise.then(enterAnimateCallback);

          $modal.$isShown = scope.$isShown = true;
          safeDigest(scope);
          // Focus once the enter-animation has started
          // Weird PhantomJS bug hack
          var el = modalElement[0];
          requestAnimationFrame(function() {
            el.focus();
          });

          bodyElement.addClass(options.prefixClass + '-open');
          if(options.animation) {
            bodyElement.addClass(options.prefixClass + '-with-' + options.animation);
          }

          // Bind events
          if(options.backdrop) {
            modalElement.on('click', hideOnBackdropClick);
            backdropElement.on('click', hideOnBackdropClick);
            backdropElement.on('wheel', preventEventDefault);
          }
          if(options.keyboard) {
            modalElement.on('keyup', $modal.$onKeyUp);
          }
        };

        function enterAnimateCallback() {
          scope.$emit(options.prefixEvent + '.show', $modal);
        }

        $modal.hide = function() {
          if(!$modal.$isShown) return;

          if(scope.$emit(options.prefixEvent + '.hide.before', $modal).defaultPrevented) {
            return;
          }
          var promise = $animate.leave(modalElement, leaveAnimateCallback);
          // Support v1.3+ $animate
          // https://github.com/angular/angular.js/commit/bf0f5502b1bbfddc5cdd2f138efd9188b8c652a9
          if(promise && promise.then) promise.then(leaveAnimateCallback);

          if(options.backdrop) {
            $animate.leave(backdropElement);
          }
          $modal.$isShown = scope.$isShown = false;
          safeDigest(scope);

          // Unbind events
          if(options.backdrop) {
            modalElement.off('click', hideOnBackdropClick);
            backdropElement.off('click', hideOnBackdropClick);
            backdropElement.off('wheel', preventEventDefault);
          }
          if(options.keyboard) {
            modalElement.off('keyup', $modal.$onKeyUp);
          }
        };

        function leaveAnimateCallback() {
          scope.$emit(options.prefixEvent + '.hide', $modal);
          bodyElement.removeClass(options.prefixClass + '-open');
          if(options.animation) {
            bodyElement.removeClass(options.prefixClass + '-with-' + options.animation);
          }
        }

        $modal.toggle = function() {

          $modal.$isShown ? $modal.hide() : $modal.show();

        };

        $modal.focus = function() {
          modalElement[0].focus();
        };

        // Protected methods

        $modal.$onKeyUp = function(evt) {

          if (evt.which === 27 && $modal.$isShown) {
            $modal.hide();
            evt.stopPropagation();
          }

        };

        // Private methods

        function hideOnBackdropClick(evt) {
          if(evt.target !== evt.currentTarget) return;
          options.backdrop === 'static' ? $modal.focus() : $modal.hide();
        }

        function preventEventDefault(evt) {
          evt.preventDefault();
        }

        return $modal;

      }

      // Helper functions

      function safeDigest(scope) {
        scope.$$phase || (scope.$root && scope.$root.$$phase) || scope.$digest();
      }

      function findElement(query, element) {
        return angular.element((element || document).querySelectorAll(query));
      }

      var fetchPromises = {};
      function fetchTemplate(template) {
        if(fetchPromises[template]) return fetchPromises[template];
        return (fetchPromises[template] = $q.when($templateCache.get(template) || $http.get(template))
        .then(function(res) {
          if(angular.isObject(res)) {
            $templateCache.put(template, res.data);
            return res.data;
          }
          return res;
        }));
      }

      return ModalFactory;

    }];

  })

  .directive('bsModal', ["$window", "$sce", "$modal", function($window, $sce, $modal) {

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {

        // Directive options
        var options = {scope: scope, element: element, show: false};
        angular.forEach(['template', 'contentTemplate', 'placement', 'backdrop', 'keyboard', 'html', 'container', 'animation', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as data-attrs
        angular.forEach(['title', 'content'], function(key) {
          attr[key] && attr.$observe(key, function(newValue, oldValue) {
            scope[key] = $sce.trustAsHtml(newValue);
          });
        });

        // Support scope as an object
        attr.bsModal && scope.$watch(attr.bsModal, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
        }, true);

        // Initialize modal
        var modal = $modal(options);

        // Trigger
        element.on(attr.trigger || 'click', modal.toggle);

        // Garbage collection
        scope.$on('$destroy', function() {
          if (modal) modal.destroy();
          options = null;
          modal = null;
        });

      }
    };

  }]);

// Source: navbar.js
angular.module('mgcrea.ngStrap.navbar', [])

  .provider('$navbar', function() {

    var defaults = this.defaults = {
      activeClass: 'active',
      routeAttr: 'data-match-route',
      strict: false
    };

    this.$get = function() {
      return {defaults: defaults};
    };

  })

  .directive('bsNavbar', ["$window", "$location", "$navbar", function($window, $location, $navbar) {

    var defaults = $navbar.defaults;

    return {
      restrict: 'A',
      link: function postLink(scope, element, attr, controller) {

        // Directive options
        var options = angular.copy(defaults);
        angular.forEach(Object.keys(defaults), function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Watch for the $location
        scope.$watch(function() {

          return $location.path();

        }, function(newValue, oldValue) {

          var liElements = element[0].querySelectorAll('li[' + options.routeAttr + ']');

          angular.forEach(liElements, function(li) {

            var liElement = angular.element(li);
            var pattern = liElement.attr(options.routeAttr).replace('/', '\\/');
            if(options.strict) {
              pattern = '^' + pattern + '$';
            }
            var regexp = new RegExp(pattern, ['i']);

            if(regexp.test(newValue)) {
              liElement.addClass(options.activeClass);
            } else {
              liElement.removeClass(options.activeClass);
            }

          });

        });

      }

    };

  }]);

// Source: popover.js
angular.module('mgcrea.ngStrap.popover', ['mgcrea.ngStrap.tooltip'])

  .provider('$popover', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      customClass: '',
      container: false,
      target: false,
      placement: 'right',
      template: 'popover/popover.tpl.html',
      contentTemplate: false,
      trigger: 'click',
      keyboard: true,
      html: false,
      title: '',
      content: '',
      delay: 0,
      autoClose: false
    };

    this.$get = ["$tooltip", function($tooltip) {

      function PopoverFactory(element, config) {

        // Common vars
        var options = angular.extend({}, defaults, config);

        var $popover = $tooltip(element, options);

        // Support scope as string options [/*title, */content]
        if(options.content) {
          $popover.$scope.content = options.content;
        }

        return $popover;

      }

      return PopoverFactory;

    }];

  })

  .directive('bsPopover', ["$window", "$sce", "$popover", function($window, $sce, $popover) {

    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr) {

        // Directive options
        var options = {scope: scope};
        angular.forEach(['template', 'contentTemplate', 'placement', 'container', 'target', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'customClass', 'autoClose', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as data-attrs
        angular.forEach(['title', 'content'], function(key) {
          attr[key] && attr.$observe(key, function(newValue, oldValue) {
            scope[key] = $sce.trustAsHtml(newValue);
            angular.isDefined(oldValue) && requestAnimationFrame(function() {
              popover && popover.$applyPlacement();
            });
          });
        });

        // Support scope as an object
        attr.bsPopover && scope.$watch(attr.bsPopover, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
          angular.isDefined(oldValue) && requestAnimationFrame(function() {
            popover && popover.$applyPlacement();
          });
        }, true);

        // Visibility binding support
        attr.bsShow && scope.$watch(attr.bsShow, function(newValue, oldValue) {
          if(!popover || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|,?(popover),?/i);
          newValue === true ? popover.show() : popover.hide();
        });

        // Initialize popover
        var popover = $popover(element, options);

        // Garbage collection
        scope.$on('$destroy', function() {
          if (popover) popover.destroy();
          options = null;
          popover = null;
        });

      }
    };

  }]);

// Source: select.js
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

// Source: tab.js
angular.module('mgcrea.ngStrap.tab', [])

  .provider('$tab', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      template: 'tab/tab.tpl.html',
      navClass: 'nav-tabs',
      activeClass: 'active'
    };

    var controller = this.controller = function($scope, $element, $attrs) {
      var self = this;

      // Attributes options
      self.$options = angular.copy(defaults);
      angular.forEach(['animation', 'navClass', 'activeClass'], function(key) {
        if(angular.isDefined($attrs[key])) self.$options[key] = $attrs[key];
      });

      // Publish options on scope
      $scope.$navClass = self.$options.navClass;
      $scope.$activeClass = self.$options.activeClass;

      self.$panes = $scope.$panes = [];

      // DEPRECATED: $viewChangeListeners, please use $activePaneChangeListeners
      // Because we deprecated ngModel usage, we rename viewChangeListeners to 
      // activePaneChangeListeners to make more sense.
      self.$activePaneChangeListeners = self.$viewChangeListeners = [];

      self.$push = function(pane) {
        self.$panes.push(pane);
      };

      self.$remove = function(pane) {
        var index = self.$panes.indexOf(pane);
        var activeIndex = self.$panes.$active;

        // remove pane from $panes array
        self.$panes.splice(index, 1);

        if (index < activeIndex) {
          // we removed a pane before the active pane, so we need to 
          // decrement the active pane index
          activeIndex--;
        }
        else if (index === activeIndex && activeIndex === self.$panes.length) {
          // we remove the active pane and it was the one at the end,
          // so select the previous one
          activeIndex--;
        }
        self.$setActive(activeIndex);
      };

      self.$panes.$active = 0;
      self.$setActive = $scope.$setActive = function(value) {
        self.$panes.$active = value;
        self.$activePaneChangeListeners.forEach(function(fn) {
          fn();
        });
      };

    };

    this.$get = function() {
      var $tab = {};
      $tab.defaults = defaults;
      $tab.controller = controller;
      return $tab;
    };

  })

  .directive('bsTabs', ["$window", "$animate", "$tab", "$parse", function($window, $animate, $tab, $parse) {

    var defaults = $tab.defaults;

    return {
      require: ['?ngModel', 'bsTabs'],
      transclude: true,
      scope: true,
      controller: ['$scope', '$element', '$attrs', $tab.controller],
      templateUrl: function(element, attr) {
        return attr.template || defaults.template;
      },
      link: function postLink(scope, element, attrs, controllers) {

        var ngModelCtrl = controllers[0];
        var bsTabsCtrl = controllers[1];

        // DEPRECATED: ngModel, please use bsActivePane
        // 'ngModel' is deprecated bacause if interferes with form validation
        // and status, so avoid using it here.
        if(ngModelCtrl) {
          console.warn('Usage of ngModel is deprecated, please use bsActivePane instead!');

          // Update the modelValue following
          bsTabsCtrl.$activePaneChangeListeners.push(function() {
            ngModelCtrl.$setViewValue(bsTabsCtrl.$panes.$active);
          });

          // modelValue -> $formatters -> viewValue
          ngModelCtrl.$formatters.push(function(modelValue) {
            // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
            bsTabsCtrl.$setActive(modelValue * 1);
            return modelValue;
          });

        }

        if (attrs.bsActivePane) {
          // adapted from angularjs ngModelController bindings
          // https://github.com/angular/angular.js/blob/v1.3.1/src%2Fng%2Fdirective%2Finput.js#L1730
          var parsedBsActivePane = $parse(attrs.bsActivePane);

          // Update bsActivePane value with change
          bsTabsCtrl.$activePaneChangeListeners.push(function() {
            parsedBsActivePane.assign(scope, bsTabsCtrl.$panes.$active);
          });

          // watch bsActivePane for value changes
          scope.$watch(attrs.bsActivePane, function(newValue, oldValue) {
            bsTabsCtrl.$setActive(newValue * 1);
          }, true);
        }
      }
    };

  }])

  .directive('bsPane', ["$window", "$animate", "$sce", function($window, $animate, $sce) {

    return {
      require: ['^?ngModel', '^bsTabs'],
      scope: true,
      link: function postLink(scope, element, attrs, controllers) {

        var ngModelCtrl = controllers[0];
        var bsTabsCtrl = controllers[1];

        // Add base class
        element.addClass('tab-pane');

        // Observe title attribute for change
        attrs.$observe('title', function(newValue, oldValue) {
          scope.title = $sce.trustAsHtml(newValue);
        });

        // Add animation class
        if(bsTabsCtrl.$options.animation) {
          element.addClass(bsTabsCtrl.$options.animation);
        }

        // Push pane to parent bsTabs controller
        bsTabsCtrl.$push(scope);

        // remove pane from tab controller when pane is destroyed
        scope.$on('$destroy', function() {
          bsTabsCtrl.$remove(scope);
        });

        function render() {
          var index = bsTabsCtrl.$panes.indexOf(scope);
          var active = bsTabsCtrl.$panes.$active;
          $animate[index === active ? 'addClass' : 'removeClass'](element, bsTabsCtrl.$options.activeClass);
        }

        bsTabsCtrl.$activePaneChangeListeners.push(function() {
          render();
        });
        render();

      }
    };

  }]);

// Source: scrollspy.js
angular.module('mgcrea.ngStrap.scrollspy', ['mgcrea.ngStrap.helpers.debounce', 'mgcrea.ngStrap.helpers.dimensions'])

  .provider('$scrollspy', function() {

    // Pool of registered spies
    var spies = this.$$spies = {};

    var defaults = this.defaults = {
      debounce: 150,
      throttle: 100,
      offset: 100
    };

    this.$get = ["$window", "$document", "$rootScope", "dimensions", "debounce", "throttle", function($window, $document, $rootScope, dimensions, debounce, throttle) {

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

    }];

  })

  .directive('bsScrollspy', ["$rootScope", "debounce", "dimensions", "$scrollspy", function($rootScope, debounce, dimensions, $scrollspy) {

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

  }])


  .directive('bsScrollspyList', ["$rootScope", "debounce", "dimensions", "$scrollspy", function($rootScope, debounce, dimensions, $scrollspy) {

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

  }]);

// Source: timepicker.js
angular.module('mgcrea.ngStrap.timepicker', [
  'mgcrea.ngStrap.helpers.dateParser',
  'mgcrea.ngStrap.helpers.dateFormatter',
  'mgcrea.ngStrap.tooltip'])

  .provider('$timepicker', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'timepicker',
      placement: 'bottom-left',
      template: 'timepicker/timepicker.tpl.html',
      trigger: 'focus',
      container: false,
      keyboard: true,
      html: false,
      delay: 0,
      // lang: $locale.id,
      useNative: true,
      timeType: 'date',
      timeFormat: 'shortTime',
      modelTimeFormat: null,
      autoclose: false,
      minTime: -Infinity,
      maxTime: +Infinity,
      length: 5,
      hourStep: 1,
      minuteStep: 5,
      iconUp: 'glyphicon glyphicon-chevron-up',
      iconDown: 'glyphicon glyphicon-chevron-down',
      arrowBehavior: 'pager'
    };

    this.$get = ["$window", "$document", "$rootScope", "$sce", "$dateFormatter", "$tooltip", "$timeout", function($window, $document, $rootScope, $sce, $dateFormatter, $tooltip, $timeout) {

      var bodyEl = angular.element($window.document.body);
      var isNative = /(ip(a|o)d|iphone|android)/ig.test($window.navigator.userAgent);
      var isTouch = ('createTouch' in $window.document) && isNative;
      if(!defaults.lang) defaults.lang = $dateFormatter.getDefaultLocale();

      function timepickerFactory(element, controller, config) {

        var $timepicker = $tooltip(element, angular.extend({}, defaults, config));
        var parentScope = config.scope;
        var options = $timepicker.$options;
        var scope = $timepicker.$scope;

        var lang = options.lang;
        var formatDate = function(date, format) {
          return $dateFormatter.formatDate(date, format, lang);
        };

        // View vars

        var selectedIndex = 0;
        var startDate = controller.$dateValue || new Date();
        var viewDate = {hour: startDate.getHours(), meridian: startDate.getHours() < 12, minute: startDate.getMinutes(), second: startDate.getSeconds(), millisecond: startDate.getMilliseconds()};

        var format = $dateFormatter.getDatetimeFormat(options.timeFormat, lang);

        var hoursFormat = $dateFormatter.hoursFormat(format),
          timeSeparator = $dateFormatter.timeSeparator(format),
          minutesFormat = $dateFormatter.minutesFormat(format),
          showAM = $dateFormatter.showAM(format);

        scope.$iconUp = options.iconUp;
        scope.$iconDown = options.iconDown;

        // Scope methods

        scope.$select = function(date, index) {
          $timepicker.select(date, index);
        };
        scope.$moveIndex = function(value, index) {
          $timepicker.$moveIndex(value, index);
        };
        scope.$switchMeridian = function(date) {
          $timepicker.switchMeridian(date);
        };

        // Public methods

        $timepicker.update = function(date) {
          // console.warn('$timepicker.update() newValue=%o', date);
          if(angular.isDate(date) && !isNaN(date.getTime())) {
            $timepicker.$date = date;
            angular.extend(viewDate, {hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds(), millisecond: date.getMilliseconds()});
            $timepicker.$build();
          } else if(!$timepicker.$isBuilt) {
            $timepicker.$build();
          }
        };

        $timepicker.select = function(date, index, keep) {
          // console.warn('$timepicker.select', date, scope.$mode);
          if(!controller.$dateValue || isNaN(controller.$dateValue.getTime())) controller.$dateValue = new Date(1970, 0, 1);
          if(!angular.isDate(date)) date = new Date(date);
          if(index === 0) controller.$dateValue.setHours(date.getHours());
          else if(index === 1) controller.$dateValue.setMinutes(date.getMinutes());
          controller.$setViewValue(angular.copy(controller.$dateValue));
          controller.$render();
          if(options.autoclose && !keep) {
            $timeout(function() { $timepicker.hide(true); });
          }
        };

        $timepicker.switchMeridian = function(date) {
          if (!controller.$dateValue || isNaN(controller.$dateValue.getTime())) {
            return;
          }
          var hours = (date || controller.$dateValue).getHours();
          controller.$dateValue.setHours(hours < 12 ? hours + 12 : hours - 12);
          controller.$setViewValue(angular.copy(controller.$dateValue));
          controller.$render();
        };

        // Protected methods

        $timepicker.$build = function() {
          // console.warn('$timepicker.$build() viewDate=%o', viewDate);
          var i, midIndex = scope.midIndex = parseInt(options.length / 2, 10);
          var hours = [], hour;
          for(i = 0; i < options.length; i++) {
            hour = new Date(1970, 0, 1, viewDate.hour - (midIndex - i) * options.hourStep);
            hours.push({date: hour, label: formatDate(hour, hoursFormat), selected: $timepicker.$date && $timepicker.$isSelected(hour, 0), disabled: $timepicker.$isDisabled(hour, 0)});
          }
          var minutes = [], minute;
          for(i = 0; i < options.length; i++) {
            minute = new Date(1970, 0, 1, 0, viewDate.minute - (midIndex - i) * options.minuteStep);
            minutes.push({date: minute, label: formatDate(minute, minutesFormat), selected: $timepicker.$date && $timepicker.$isSelected(minute, 1), disabled: $timepicker.$isDisabled(minute, 1)});
          }

          var rows = [];
          for(i = 0; i < options.length; i++) {
            rows.push([hours[i], minutes[i]]);
          }
          scope.rows = rows;
          scope.showAM = showAM;
          scope.isAM = ($timepicker.$date || hours[midIndex].date).getHours() < 12;
          scope.timeSeparator = timeSeparator;
          $timepicker.$isBuilt = true;
        };

        $timepicker.$isSelected = function(date, index) {
          if(!$timepicker.$date) return false;
          else if(index === 0) {
            return date.getHours() === $timepicker.$date.getHours();
          } else if(index === 1) {
            return date.getMinutes() === $timepicker.$date.getMinutes();
          }
        };

        $timepicker.$isDisabled = function(date, index) {
          var selectedTime;
          if(index === 0) {
            selectedTime = date.getTime() + viewDate.minute * 6e4;
          } else if(index === 1) {
            selectedTime = date.getTime() + viewDate.hour * 36e5;
          }
          return selectedTime < options.minTime * 1 || selectedTime > options.maxTime * 1;
        };

        scope.$arrowAction = function (value, index) {
          if (options.arrowBehavior === 'picker') {
            $timepicker.$setTimeByStep(value,index);
          } else {
            $timepicker.$moveIndex(value,index);
          }
        };

        $timepicker.$setTimeByStep = function(value, index) {
          var newDate = new Date($timepicker.$date);
          var hours = newDate.getHours(), hoursLength = formatDate(newDate, hoursFormat).length;
          var minutes = newDate.getMinutes(), minutesLength = formatDate(newDate, minutesFormat).length;
          if (index === 0) {
            newDate.setHours(hours - (parseInt(options.hourStep, 10) * value));
          }
          else {
            newDate.setMinutes(minutes - (parseInt(options.minuteStep, 10) * value));
          }
          $timepicker.select(newDate, index, true);
        };

        $timepicker.$moveIndex = function(value, index) {
          var targetDate;
          if(index === 0) {
            targetDate = new Date(1970, 0, 1, viewDate.hour + (value * options.length), viewDate.minute);
            angular.extend(viewDate, {hour: targetDate.getHours()});
          } else if(index === 1) {
            targetDate = new Date(1970, 0, 1, viewDate.hour, viewDate.minute + (value * options.length * options.minuteStep));
            angular.extend(viewDate, {minute: targetDate.getMinutes()});
          }
          $timepicker.$build();
        };

        $timepicker.$onMouseDown = function(evt) {
          // Prevent blur on mousedown on .dropdown-menu
          if(evt.target.nodeName.toLowerCase() !== 'input') evt.preventDefault();
          evt.stopPropagation();
          // Emulate click for mobile devices
          if(isTouch) {
            var targetEl = angular.element(evt.target);
            if(targetEl[0].nodeName.toLowerCase() !== 'button') {
              targetEl = targetEl.parent();
            }
            targetEl.triggerHandler('click');
          }
        };

        $timepicker.$onKeyDown = function(evt) {
          if (!/(38|37|39|40|13)/.test(evt.keyCode) || evt.shiftKey || evt.altKey) return;
          evt.preventDefault();
          evt.stopPropagation();

          // Close on enter
          if(evt.keyCode === 13) return $timepicker.hide(true);

          // Navigate with keyboard
          var newDate = new Date($timepicker.$date);
          var hours = newDate.getHours(), hoursLength = formatDate(newDate, hoursFormat).length;
          var minutes = newDate.getMinutes(), minutesLength = formatDate(newDate, minutesFormat).length;
          var lateralMove = /(37|39)/.test(evt.keyCode);
          var count = 2 + showAM * 1;

          // Navigate indexes (left, right)
          if (lateralMove) {
            if(evt.keyCode === 37) selectedIndex = selectedIndex < 1 ? count - 1 : selectedIndex - 1;
            else if(evt.keyCode === 39) selectedIndex = selectedIndex < count - 1 ? selectedIndex + 1 : 0;
          }

          // Update values (up, down)
          var selectRange = [0, hoursLength];
          if(selectedIndex === 0) {
            if(evt.keyCode === 38) newDate.setHours(hours - parseInt(options.hourStep, 10));
            else if(evt.keyCode === 40) newDate.setHours(hours + parseInt(options.hourStep, 10));
            // re-calculate hours length because we have changed hours value
            hoursLength = formatDate(newDate, hoursFormat).length;
            selectRange = [0, hoursLength];
          } else if(selectedIndex === 1) {
            if(evt.keyCode === 38) newDate.setMinutes(minutes - parseInt(options.minuteStep, 10));
            else if(evt.keyCode === 40) newDate.setMinutes(minutes + parseInt(options.minuteStep, 10));
            // re-calculate minutes length because we have changes minutes value
            minutesLength = formatDate(newDate, minutesFormat).length;
            selectRange = [hoursLength + 1, hoursLength + 1 + minutesLength];
          } else if(selectedIndex === 2) {
            if(!lateralMove) $timepicker.switchMeridian();
            selectRange = [hoursLength + 1 + minutesLength + 1, hoursLength + 1 + minutesLength + 3];
          }
          $timepicker.select(newDate, selectedIndex, true);
          createSelection(selectRange[0], selectRange[1]);
          parentScope.$digest();
        };

        // Private

        function createSelection(start, end) {
          if(element[0].createTextRange) {
            var selRange = element[0].createTextRange();
            selRange.collapse(true);
            selRange.moveStart('character', start);
            selRange.moveEnd('character', end);
            selRange.select();
          } else if(element[0].setSelectionRange) {
            element[0].setSelectionRange(start, end);
          } else if(angular.isUndefined(element[0].selectionStart)) {
            element[0].selectionStart = start;
            element[0].selectionEnd = end;
          }
        }

        function focusElement() {
          element[0].focus();
        }

        // Overrides

        var _init = $timepicker.init;
        $timepicker.init = function() {
          if(isNative && options.useNative) {
            element.prop('type', 'time');
            element.css('-webkit-appearance', 'textfield');
            return;
          } else if(isTouch) {
            element.prop('type', 'text');
            element.attr('readonly', 'true');
            element.on('click', focusElement);
          }
          _init();
        };

        var _destroy = $timepicker.destroy;
        $timepicker.destroy = function() {
          if(isNative && options.useNative) {
            element.off('click', focusElement);
          }
          _destroy();
        };

        var _show = $timepicker.show;
        $timepicker.show = function() {
          _show();
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            $timepicker.$element.on(isTouch ? 'touchstart' : 'mousedown', $timepicker.$onMouseDown);
            if(options.keyboard) {
              element.on('keydown', $timepicker.$onKeyDown);
            }
          }, 0, false);
        };

        var _hide = $timepicker.hide;
        $timepicker.hide = function(blur) {
          if(!$timepicker.$isShown) return;
          $timepicker.$element.off(isTouch ? 'touchstart' : 'mousedown', $timepicker.$onMouseDown);
          if(options.keyboard) {
            element.off('keydown', $timepicker.$onKeyDown);
          }
          _hide(blur);
        };

        return $timepicker;

      }

      timepickerFactory.defaults = defaults;
      return timepickerFactory;

    }];

  })


  .directive('bsTimepicker', ["$window", "$parse", "$q", "$dateFormatter", "$dateParser", "$timepicker", function($window, $parse, $q, $dateFormatter, $dateParser, $timepicker) {

    var defaults = $timepicker.defaults;
    var isNative = /(ip(a|o)d|iphone|android)/ig.test($window.navigator.userAgent);
    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
      restrict: 'EAC',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        // Directive options
        var options = {scope: scope, controller: controller};
        angular.forEach(['placement', 'container', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'template', 'autoclose', 'timeType', 'timeFormat', 'modelTimeFormat', 'useNative', 'hourStep', 'minuteStep', 'length', 'arrowBehavior', 'iconUp', 'iconDown', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Visibility binding support
        attr.bsShow && scope.$watch(attr.bsShow, function(newValue, oldValue) {
          if(!timepicker || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|,?(timepicker),?/i);
          newValue === true ? timepicker.show() : timepicker.hide();
        });

        // Initialize timepicker
        if(isNative && (options.useNative || defaults.useNative)) options.timeFormat = 'HH:mm';
        var timepicker = $timepicker(element, controller, options);
        options = timepicker.$options;

        var lang = options.lang;
        var formatDate = function(date, format) {
          return $dateFormatter.formatDate(date, format, lang);
        };

        // Initialize parser
        var dateParser = $dateParser({format: options.timeFormat, lang: lang});

        // Observe attributes for changes
        angular.forEach(['minTime', 'maxTime'], function(key) {
          // console.warn('attr.$observe(%s)', key, attr[key]);
          angular.isDefined(attr[key]) && attr.$observe(key, function(newValue) {
            timepicker.$options[key] = dateParser.getTimeForAttribute(key, newValue);
            !isNaN(timepicker.$options[key]) && timepicker.$build();
            validateAgainstMinMaxTime(controller.$dateValue);
          });
        });

        // Watch model for changes
        scope.$watch(attr.ngModel, function(newValue, oldValue) {
          // console.warn('scope.$watch(%s)', attr.ngModel, newValue, oldValue, controller.$dateValue);
          timepicker.update(controller.$dateValue);
        }, true);

        function validateAgainstMinMaxTime(parsedTime) {
          if (!angular.isDate(parsedTime)) return;
          var isMinValid = isNaN(options.minTime) || new Date(parsedTime.getTime()).setFullYear(1970, 0, 1) >= options.minTime;
          var isMaxValid = isNaN(options.maxTime) || new Date(parsedTime.getTime()).setFullYear(1970, 0, 1) <= options.maxTime;
          var isValid = isMinValid && isMaxValid;
          controller.$setValidity('date', isValid);
          controller.$setValidity('min', isMinValid);
          controller.$setValidity('max', isMaxValid);
          // Only update the model when we have a valid date
          if(!isValid) {
              return;
          }
          controller.$dateValue = parsedTime;
        }

        // viewValue -> $parsers -> modelValue
        controller.$parsers.unshift(function(viewValue) {
          // console.warn('$parser("%s"): viewValue=%o', element.attr('ng-model'), viewValue);
          // Null values should correctly reset the model value & validity
          if(!viewValue) {
            // BREAKING CHANGE:
            // return null (not undefined) when input value is empty, so angularjs 1.3
            // ngModelController can go ahead and run validators, like ngRequired
            controller.$setValidity('date', true);
            return null;
          }
          var parsedTime = angular.isDate(viewValue) ? viewValue : dateParser.parse(viewValue, controller.$dateValue);
          if(!parsedTime || isNaN(parsedTime.getTime())) {
            controller.$setValidity('date', false);
            // return undefined, causes ngModelController to
            // invalidate model value
            return;
          } else {
            validateAgainstMinMaxTime(parsedTime);
          }
          if(options.timeType === 'string') {
            return formatDate(parsedTime, options.modelTimeFormat || options.timeFormat);
          } else if(options.timeType === 'number') {
            return controller.$dateValue.getTime();
          } else if(options.timeType === 'unix') {
            return controller.$dateValue.getTime() / 1000;
          } else if(options.timeType === 'iso') {
            return controller.$dateValue.toISOString();
          } else {
            return new Date(controller.$dateValue);
          }
        });

        // modelValue -> $formatters -> viewValue
        controller.$formatters.push(function(modelValue) {
          // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
          var date;
          if(angular.isUndefined(modelValue) || modelValue === null) {
            date = NaN;
          } else if(angular.isDate(modelValue)) {
            date = modelValue;
          } else if(options.timeType === 'string') {
            date = dateParser.parse(modelValue, null, options.modelTimeFormat);
          } else if(options.timeType === 'unix') {
            date = new Date(modelValue * 1000);
          } else {
            date = new Date(modelValue);
          }
          // Setup default value?
          // if(isNaN(date.getTime())) date = new Date(new Date().setMinutes(0) + 36e5);
          controller.$dateValue = date;
          return getTimeFormattedString();
        });

        // viewValue -> element
        controller.$render = function() {
          // console.warn('$render("%s"): viewValue=%o', element.attr('ng-model'), controller.$viewValue);
          element.val(getTimeFormattedString());
        };

        function getTimeFormattedString() {
          return !controller.$dateValue || isNaN(controller.$dateValue.getTime()) ? '' : formatDate(controller.$dateValue, options.timeFormat);
        }

        // Garbage collection
        scope.$on('$destroy', function() {
          if (timepicker) timepicker.destroy();
          options = null;
          timepicker = null;
        });

      }
    };

  }]);

// Source: tooltip.js
angular.module('mgcrea.ngStrap.tooltip', ['mgcrea.ngStrap.helpers.dimensions'])

  .provider('$tooltip', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      customClass: '',
      prefixClass: 'tooltip',
      prefixEvent: 'tooltip',
      container: false,
      target: false,
      placement: 'top',
      template: 'tooltip/tooltip.tpl.html',
      contentTemplate: false,
      trigger: 'hover focus',
      keyboard: false,
      html: false,
      show: false,
      title: '',
      type: '',
      delay: 0,
      autoClose: false,
      bsEnabled: true
    };

    this.$get = ["$window", "$rootScope", "$compile", "$q", "$templateCache", "$http", "$animate", "$sce", "dimensions", "$$rAF", "$timeout", function($window, $rootScope, $compile, $q, $templateCache, $http, $animate, $sce, dimensions, $$rAF, $timeout) {

      var trim = String.prototype.trim;
      var isTouch = 'createTouch' in $window.document;
      var htmlReplaceRegExp = /ng-bind="/ig;
      var $body = angular.element($window.document);

      function TooltipFactory(element, config) {

        var $tooltip = {};

        // Common vars
        var nodeName = element[0].nodeName.toLowerCase();
        var options = $tooltip.$options = angular.extend({}, defaults, config);
        $tooltip.$promise = fetchTemplate(options.template);
        var scope = $tooltip.$scope = options.scope && options.scope.$new() || $rootScope.$new();
        if(options.delay && angular.isString(options.delay)) {
          var split = options.delay.split(',').map(parseFloat);
          options.delay = split.length > 1 ? {show: split[0], hide: split[1]} : split[0];
        }

        // store $id to identify the triggering element in events
        // give priority to options.id, otherwise, try to use
        // element id if defined
        $tooltip.$id = options.id || element.attr('id') || '';

        // Support scope as string options
        if(options.title) {
          scope.title = $sce.trustAsHtml(options.title);
        }

        // Provide scope helpers
        scope.$setEnabled = function(isEnabled) {
          scope.$$postDigest(function() {
            $tooltip.setEnabled(isEnabled);
          });
        };
        scope.$hide = function() {
          scope.$$postDigest(function() {
            $tooltip.hide();
          });
        };
        scope.$show = function() {
          scope.$$postDigest(function() {
            $tooltip.show();
          });
        };
        scope.$toggle = function() {
          scope.$$postDigest(function() {
            $tooltip.toggle();
          });
        };
        // Publish isShown as a protected var on scope
        $tooltip.$isShown = scope.$isShown = false;

        // Private vars
        var timeout, hoverState;

        // Support contentTemplate option
        if(options.contentTemplate) {
          $tooltip.$promise = $tooltip.$promise.then(function(template) {
            var templateEl = angular.element(template);
            return fetchTemplate(options.contentTemplate)
            .then(function(contentTemplate) {
              var contentEl = findElement('[ng-bind="content"]', templateEl[0]);
              if(!contentEl.length) contentEl = findElement('[ng-bind="title"]', templateEl[0]);
              contentEl.removeAttr('ng-bind').html(contentTemplate);
              return templateEl[0].outerHTML;
            });
          });
        }

        // Fetch, compile then initialize tooltip
        var tipLinker, tipElement, tipTemplate, tipContainer, tipScope;
        $tooltip.$promise.then(function(template) {
          if(angular.isObject(template)) template = template.data;
          if(options.html) template = template.replace(htmlReplaceRegExp, 'ng-bind-html="');
          template = trim.apply(template);
          tipTemplate = template;
          tipLinker = $compile(template);
          $tooltip.init();
        });

        $tooltip.init = function() {

          // Options: delay
          if (options.delay && angular.isNumber(options.delay)) {
            options.delay = {
              show: options.delay,
              hide: options.delay
            };
          }

          // Replace trigger on touch devices ?
          // if(isTouch && options.trigger === defaults.trigger) {
          //   options.trigger.replace(/hover/g, 'click');
          // }

          // Options : container
          if(options.container === 'self') {
            tipContainer = element;
          } else if(angular.isElement(options.container)) {
            tipContainer = options.container;
          } else if(options.container) {
            tipContainer = findElement(options.container);
          }

          // Options: trigger
          bindTriggerEvents();

          // Options: target
          if(options.target) {
            options.target = angular.isElement(options.target) ? options.target : findElement(options.target);
          }

          // Options: show
          if(options.show) {
            scope.$$postDigest(function() {
              options.trigger === 'focus' ? element[0].focus() : $tooltip.show();
            });
          }

        };

        $tooltip.destroy = function() {

          // Unbind events
          unbindTriggerEvents();

          // Remove element
          destroyTipElement();

          // Destroy scope
          scope.$destroy();

        };

        $tooltip.enter = function() {

          clearTimeout(timeout);
          hoverState = 'in';
          if (!options.delay || !options.delay.show) {
            return $tooltip.show();
          }

          timeout = setTimeout(function() {
            if (hoverState ==='in') $tooltip.show();
          }, options.delay.show);

        };

        $tooltip.show = function() {
          if (!options.bsEnabled || $tooltip.$isShown) return;

          scope.$emit(options.prefixEvent + '.show.before', $tooltip);
          var parent, after;
          if (options.container) {
            parent = tipContainer;
            if (tipContainer[0].lastChild) {
              after = angular.element(tipContainer[0].lastChild);
            } else {
              after = null;
            }
          } else {
            parent = null;
            after = element;
          }


          // Hide any existing tipElement
          if(tipElement) destroyTipElement();
          // Fetch a cloned element linked from template
          tipScope = $tooltip.$scope.$new();
          tipElement = $tooltip.$element = tipLinker(tipScope, function(clonedElement, scope) {});

          // Set the initial positioning.  Make the tooltip invisible
          // so IE doesn't try to focus on it off screen.
          tipElement.css({top: '-9999px', left: '-9999px', display: 'block', visibility: 'hidden'});

          // Options: animation
          if(options.animation) tipElement.addClass(options.animation);
          // Options: type
          if(options.type) tipElement.addClass(options.prefixClass + '-' + options.type);
          // Options: custom classes
          if(options.customClass) tipElement.addClass(options.customClass);

          // Support v1.3+ $animate
          // https://github.com/angular/angular.js/commit/bf0f5502b1bbfddc5cdd2f138efd9188b8c652a9
          var promise = $animate.enter(tipElement, parent, after, enterAnimateCallback);
          if(promise && promise.then) promise.then(enterAnimateCallback);

          $tooltip.$isShown = scope.$isShown = true;
          safeDigest(scope);
          $$rAF(function () {
            $tooltip.$applyPlacement();

            // Once placed, make the tooltip visible
            if(tipElement) tipElement.css({visibility: 'visible'});
          }); // var a = bodyEl.offsetWidth + 1; ?

          // Bind events
          if(options.keyboard) {
            if(options.trigger !== 'focus') {
              $tooltip.focus();
            }
            bindKeyboardEvents();
          }

          if(options.autoClose) {
            bindAutoCloseEvents();
          }

        };

        function enterAnimateCallback() {
          scope.$emit(options.prefixEvent + '.show', $tooltip);
        }

        $tooltip.leave = function() {

          clearTimeout(timeout);
          hoverState = 'out';
          if (!options.delay || !options.delay.hide) {
            return $tooltip.hide();
          }
          timeout = setTimeout(function () {
            if (hoverState === 'out') {
              $tooltip.hide();
            }
          }, options.delay.hide);

        };

        var _blur;
        var _tipToHide;
        $tooltip.hide = function(blur) {

          if(!$tooltip.$isShown) return;
          scope.$emit(options.prefixEvent + '.hide.before', $tooltip);

          // store blur value for leaveAnimateCallback to use
          _blur = blur;

          // store current tipElement reference to use
          // in leaveAnimateCallback
          _tipToHide = tipElement;

          // Support v1.3+ $animate
          // https://github.com/angular/angular.js/commit/bf0f5502b1bbfddc5cdd2f138efd9188b8c652a9
          var promise = $animate.leave(tipElement, leaveAnimateCallback);
          if(promise && promise.then) promise.then(leaveAnimateCallback);

          $tooltip.$isShown = scope.$isShown = false;
          safeDigest(scope);

          // Unbind events
          if(options.keyboard && tipElement !== null) {
            unbindKeyboardEvents();
          }

          if(options.autoClose && tipElement !== null) {
            unbindAutoCloseEvents();
          }
        };

        function leaveAnimateCallback() {
          scope.$emit(options.prefixEvent + '.hide', $tooltip);

          // check if current tipElement still references
          // the same element when hide was called
          if (tipElement === _tipToHide) {
            // Allow to blur the input when hidden, like when pressing enter key
            if(_blur && options.trigger === 'focus') {
              return element[0].blur();
            }

            // clean up child scopes
            destroyTipElement();
          }
        }

        $tooltip.toggle = function() {
          $tooltip.$isShown ? $tooltip.leave() : $tooltip.enter();
        };

        $tooltip.focus = function() {
          tipElement[0].focus();
        };

        $tooltip.setEnabled = function(isEnabled) {
          options.bsEnabled = isEnabled;
        };

        // Protected methods

        $tooltip.$applyPlacement = function() {
          if(!tipElement) return;

          // Determine if we're doing an auto or normal placement
          var placement = options.placement,
              autoToken = /\s?auto?\s?/i,
              autoPlace  = autoToken.test(placement);

          if (autoPlace) {
            placement = placement.replace(autoToken, '') || defaults.placement;
          }

          // Need to add the position class before we get
          // the offsets
          tipElement.addClass(options.placement);

          // Get the position of the target element
          // and the height and width of the tooltip so we can center it.
          var elementPosition = getPosition(),
              tipWidth = tipElement.prop('offsetWidth'),
              tipHeight = tipElement.prop('offsetHeight');

          // If we're auto placing, we need to check the positioning
          if (autoPlace) {
            var originalPlacement = placement;
            var container = options.container ? angular.element(document.querySelector(options.container)) : element.parent();
            var containerPosition = getPosition(container);

            // Determine if the vertical placement
            if (originalPlacement.indexOf('bottom') >= 0 && elementPosition.bottom + tipHeight > containerPosition.bottom) {
              placement = originalPlacement.replace('bottom', 'top');
            } else if (originalPlacement.indexOf('top') >= 0 && elementPosition.top - tipHeight < containerPosition.top) {
              placement = originalPlacement.replace('top', 'bottom');
            }

            // Determine the horizontal placement
            // The exotic placements of left and right are opposite of the standard placements.  Their arrows are put on the left/right
            // and flow in the opposite direction of their placement.
            if ((originalPlacement === 'right' || originalPlacement === 'bottom-left' || originalPlacement === 'top-left') &&
                elementPosition.right + tipWidth > containerPosition.width) {

              placement = originalPlacement === 'right' ? 'left' : placement.replace('left', 'right');
            } else if ((originalPlacement === 'left' || originalPlacement === 'bottom-right' || originalPlacement === 'top-right') &&
                elementPosition.left - tipWidth < containerPosition.left) {

              placement = originalPlacement === 'left' ? 'right' : placement.replace('right', 'left');
            }

            tipElement.removeClass(originalPlacement).addClass(placement);
          }

          // Get the tooltip's top and left coordinates to center it with this directive.
          var tipPosition = getCalculatedOffset(placement, elementPosition, tipWidth, tipHeight);
          applyPlacementCss(tipPosition.top, tipPosition.left);
        };

        $tooltip.$onKeyUp = function(evt) {
          if (evt.which === 27 && $tooltip.$isShown) {
            $tooltip.hide();
            evt.stopPropagation();
          }
        };

        $tooltip.$onFocusKeyUp = function(evt) {
          if (evt.which === 27) {
            element[0].blur();
            evt.stopPropagation();
          }
        };

        $tooltip.$onFocusElementMouseDown = function(evt) {
          evt.preventDefault();
          evt.stopPropagation();
          // Some browsers do not auto-focus buttons (eg. Safari)
          $tooltip.$isShown ? element[0].blur() : element[0].focus();
        };

        // bind/unbind events
        function bindTriggerEvents() {
          var triggers = options.trigger.split(' ');
          angular.forEach(triggers, function(trigger) {
            if(trigger === 'click') {
              element.on('click', $tooltip.toggle);
            } else if(trigger !== 'manual') {
              element.on(trigger === 'hover' ? 'mouseenter' : 'focus', $tooltip.enter);
              element.on(trigger === 'hover' ? 'mouseleave' : 'blur', $tooltip.leave);
              nodeName === 'button' && trigger !== 'hover' && element.on(isTouch ? 'touchstart' : 'mousedown', $tooltip.$onFocusElementMouseDown);
            }
          });
        }

        function unbindTriggerEvents() {
          var triggers = options.trigger.split(' ');
          for (var i = triggers.length; i--;) {
            var trigger = triggers[i];
            if(trigger === 'click') {
              element.off('click', $tooltip.toggle);
            } else if(trigger !== 'manual') {
              element.off(trigger === 'hover' ? 'mouseenter' : 'focus', $tooltip.enter);
              element.off(trigger === 'hover' ? 'mouseleave' : 'blur', $tooltip.leave);
              nodeName === 'button' && trigger !== 'hover' && element.off(isTouch ? 'touchstart' : 'mousedown', $tooltip.$onFocusElementMouseDown);
            }
          }
        }

        function bindKeyboardEvents() {
          if(options.trigger !== 'focus') {
            tipElement.on('keyup', $tooltip.$onKeyUp);
          } else {
            element.on('keyup', $tooltip.$onFocusKeyUp);
          }
        }

        function unbindKeyboardEvents() {
          if(options.trigger !== 'focus') {
            tipElement.off('keyup', $tooltip.$onKeyUp);
          } else {
            element.off('keyup', $tooltip.$onFocusKeyUp);
          }
        }

        var _autoCloseEventsBinded = false;
        function bindAutoCloseEvents() {
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            // Stop propagation when clicking inside tooltip
            tipElement.on('click', stopEventPropagation);

            // Hide when clicking outside tooltip
            $body.on('click', $tooltip.hide);

            _autoCloseEventsBinded = true;
          }, 0, false);
        }

        function unbindAutoCloseEvents() {
          if (_autoCloseEventsBinded) {
            tipElement.off('click', stopEventPropagation);
            $body.off('click', $tooltip.hide);
            _autoCloseEventsBinded = false;
          }
        }

        function stopEventPropagation(event) {
          event.stopPropagation();
        }

        // Private methods

        function getPosition($element) {
          $element = $element || (options.target || element);

          var el = $element[0];

          var elRect = el.getBoundingClientRect();
          if (elRect.width === null) {
            // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
            elRect = angular.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top });
          }

          var elPos;
          if (options.container === 'body') {
            elPos = dimensions.offset(el);
          } else {
            elPos = dimensions.position(el);
          }

          return angular.extend({}, elRect, elPos);
        }

        function getCalculatedOffset(placement, position, actualWidth, actualHeight) {
          var offset;
          var split = placement.split('-');

          switch (split[0]) {
          case 'right':
            offset = {
              top: position.top + position.height / 2 - actualHeight / 2,
              left: position.left + position.width
            };
            break;
          case 'bottom':
            offset = {
              top: position.top + position.height,
              left: position.left + position.width / 2 - actualWidth / 2
            };
            break;
          case 'left':
            offset = {
              top: position.top + position.height / 2 - actualHeight / 2,
              left: position.left - actualWidth
            };
            break;
          default:
            offset = {
              top: position.top - actualHeight,
              left: position.left + position.width / 2 - actualWidth / 2
            };
            break;
          }

          if(!split[1]) {
            return offset;
          }

          // Add support for corners @todo css
          if(split[0] === 'top' || split[0] === 'bottom') {
            switch (split[1]) {
            case 'left':
              offset.left = position.left;
              break;
            case 'right':
              offset.left =  position.left + position.width - actualWidth;
            }
          } else if(split[0] === 'left' || split[0] === 'right') {
            switch (split[1]) {
            case 'top':
              offset.top = position.top - actualHeight;
              break;
            case 'bottom':
              offset.top = position.top + position.height;
            }
          }

          return offset;
        }

        function applyPlacementCss(top, left) {
          tipElement.css({ top: top + 'px', left: left + 'px' });
        }

        function destroyTipElement() {
          // Cancel pending callbacks
          clearTimeout(timeout);

          if($tooltip.$isShown && tipElement !== null) {
            if(options.autoClose) {
              unbindAutoCloseEvents();
            }

            if(options.keyboard) {
              unbindKeyboardEvents();
            }
          }

          if(tipScope) {
            tipScope.$destroy();
            tipScope = null;
          }

          if(tipElement) {
            tipElement.remove();
            tipElement = $tooltip.$element = null;
          }
        }

        return $tooltip;

      }

      // Helper functions

      function safeDigest(scope) {
        scope.$$phase || (scope.$root && scope.$root.$$phase) || scope.$digest();
      }

      function findElement(query, element) {
        return angular.element((element || document).querySelectorAll(query));
      }

      var fetchPromises = {};
      function fetchTemplate(template) {
        if(fetchPromises[template]) return fetchPromises[template];
        return (fetchPromises[template] = $q.when($templateCache.get(template) || $http.get(template))
        .then(function(res) {
          if(angular.isObject(res)) {
            $templateCache.put(template, res.data);
            return res.data;
          }
          return res;
        }));
      }

      return TooltipFactory;

    }];

  })

  .directive('bsTooltip', ["$window", "$location", "$sce", "$tooltip", "$$rAF", function($window, $location, $sce, $tooltip, $$rAF) {

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {

        // Directive options
        var options = {scope: scope};
        angular.forEach(['template', 'contentTemplate', 'placement', 'container', 'target', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'backdropAnimation', 'type', 'customClass', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // overwrite inherited title value when no value specified
        // fix for angular 1.3.1 531a8de72c439d8ddd064874bf364c00cedabb11
        if (!scope.hasOwnProperty('title')){
          scope.title = '';
        }

        // Observe scope attributes for change
        attr.$observe('title', function(newValue) {
          if (angular.isDefined(newValue) || !scope.hasOwnProperty('title')) {
            var oldValue = scope.title;
            scope.title = $sce.trustAsHtml(newValue);
            angular.isDefined(oldValue) && $$rAF(function() {
              tooltip && tooltip.$applyPlacement();
            });
          }
        });

        // Support scope as an object
        attr.bsTooltip && scope.$watch(attr.bsTooltip, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.title = newValue;
          }
          angular.isDefined(oldValue) && $$rAF(function() {
            tooltip && tooltip.$applyPlacement();
          });
        }, true);

        // Visibility binding support
        attr.bsShow && scope.$watch(attr.bsShow, function(newValue, oldValue) {
          if(!tooltip || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|,?(tooltip),?/i);
          newValue === true ? tooltip.show() : tooltip.hide();
        });

        // Enabled binding support
        attr.bsEnabled && scope.$watch(attr.bsEnabled, function(newValue, oldValue) {
          // console.warn('scope.$watch(%s)', attr.bsEnabled, newValue, oldValue);
          if(!tooltip || !angular.isDefined(newValue)) return;
          if(angular.isString(newValue)) newValue = !!newValue.match(/true|1|,?(tooltip),?/i);
          newValue === false ? tooltip.setEnabled(false) : tooltip.setEnabled(true);
        });

        // Initialize popover
        var tooltip = $tooltip(element, options);

        // Garbage collection
        scope.$on('$destroy', function() {
          if(tooltip) tooltip.destroy();
          options = null;
          tooltip = null;
        });

      }
    };

  }]);

// Source: typeahead.js
angular.module('mgcrea.ngStrap.typeahead', ['mgcrea.ngStrap.tooltip', 'mgcrea.ngStrap.helpers.parseOptions'])

  .provider('$typeahead', function() {

    var defaults = this.defaults = {
      animation: 'am-fade',
      prefixClass: 'typeahead',
      prefixEvent: '$typeahead',
      placement: 'bottom-left',
      template: 'typeahead/typeahead.tpl.html',
      trigger: 'focus',
      container: false,
      keyboard: true,
      html: false,
      delay: 0,
      minLength: 1,
      filter: 'filter',
      limit: 6,
      comparator: ''
    };

    this.$get = ["$window", "$rootScope", "$tooltip", "$timeout", function($window, $rootScope, $tooltip, $timeout) {

      var bodyEl = angular.element($window.document.body);

      function TypeaheadFactory(element, controller, config) {

        var $typeahead = {};

        // Common vars
        var options = angular.extend({}, defaults, config);

        $typeahead = $tooltip(element, options);
        var parentScope = config.scope;
        var scope = $typeahead.$scope;

        scope.$resetMatches = function(){
          scope.$matches = [];
          scope.$activeIndex = 0;
        };
        scope.$resetMatches();

        scope.$activate = function(index) {
          scope.$$postDigest(function() {
            $typeahead.activate(index);
          });
        };

        scope.$select = function(index, evt) {
          scope.$$postDigest(function() {
            $typeahead.select(index);
          });
        };

        scope.$isVisible = function() {
          return $typeahead.$isVisible();
        };

        // Public methods

        $typeahead.update = function(matches) {
          scope.$matches = matches;
          if(scope.$activeIndex >= matches.length) {
            scope.$activeIndex = 0;
          }
        };

        $typeahead.activate = function(index) {
          scope.$activeIndex = index;
        };

        $typeahead.select = function(index) {
          var value = scope.$matches[index].value;
          // console.log('$setViewValue', value);
          controller.$setViewValue(value);
          controller.$render();
          scope.$resetMatches();
          if(parentScope) parentScope.$digest();
          // Emit event
          scope.$emit(options.prefixEvent + '.select', value, index, $typeahead);
        };

        // Protected methods

        $typeahead.$isVisible = function() {
          if(!options.minLength || !controller) {
            return !!scope.$matches.length;
          }
          // minLength support
          return scope.$matches.length && angular.isString(controller.$viewValue) && controller.$viewValue.length >= options.minLength;
        };

        $typeahead.$getIndex = function(value) {
          var l = scope.$matches.length, i = l;
          if(!l) return;
          for(i = l; i--;) {
            if(scope.$matches[i].value === value) break;
          }
          if(i < 0) return;
          return i;
        };

        $typeahead.$onMouseDown = function(evt) {
          // Prevent blur on mousedown
          evt.preventDefault();
          evt.stopPropagation();
        };

        $typeahead.$onKeyDown = function(evt) {
          if(!/(38|40|13)/.test(evt.keyCode)) return;

          // Let ngSubmit pass if the typeahead tip is hidden
          if($typeahead.$isVisible()) {
            evt.preventDefault();
            evt.stopPropagation();
          }

          // Select with enter
          if(evt.keyCode === 13 && scope.$matches.length) {
            $typeahead.select(scope.$activeIndex);
          }

          // Navigate with keyboard
          else if(evt.keyCode === 38 && scope.$activeIndex > 0) scope.$activeIndex--;
          else if(evt.keyCode === 40 && scope.$activeIndex < scope.$matches.length - 1) scope.$activeIndex++;
          else if(angular.isUndefined(scope.$activeIndex)) scope.$activeIndex = 0;
          scope.$digest();
        };

        // Overrides

        var show = $typeahead.show;
        $typeahead.show = function() {
          show();
          // use timeout to hookup the events to prevent
          // event bubbling from being processed imediately.
          $timeout(function() {
            $typeahead.$element.on('mousedown', $typeahead.$onMouseDown);
            if(options.keyboard) {
              element.on('keydown', $typeahead.$onKeyDown);
            }
          }, 0, false);
        };

        var hide = $typeahead.hide;
        $typeahead.hide = function() {
          $typeahead.$element.off('mousedown', $typeahead.$onMouseDown);
          if(options.keyboard) {
            element.off('keydown', $typeahead.$onKeyDown);
          }
          hide();
        };

        return $typeahead;

      }

      TypeaheadFactory.defaults = defaults;
      return TypeaheadFactory;

    }];

  })

  .directive('bsTypeahead', ["$window", "$parse", "$q", "$typeahead", "$parseOptions", function($window, $parse, $q, $typeahead, $parseOptions) {

    var defaults = $typeahead.defaults;

    return {
      restrict: 'EAC',
      require: 'ngModel',
      link: function postLink(scope, element, attr, controller) {

        // Directive options
        var options = {scope: scope};
        angular.forEach(['placement', 'container', 'delay', 'trigger', 'keyboard', 'html', 'animation', 'template', 'filter', 'limit', 'minLength', 'watchOptions', 'selectMode', 'comparator', 'id'], function(key) {
          if(angular.isDefined(attr[key])) options[key] = attr[key];
        });

        // Build proper ngOptions
        var filter = options.filter || defaults.filter;
        var limit = options.limit || defaults.limit;
        var comparator = options.comparator || defaults.comparator;

        var ngOptions = attr.ngOptions;
        if(filter) ngOptions += ' | ' + filter + ':$viewValue';
        if (comparator) ngOptions += ':' + comparator;
        if(limit) ngOptions += ' | limitTo:' + limit;
        var parsedOptions = $parseOptions(ngOptions);

        // Initialize typeahead
        var typeahead = $typeahead(element, controller, options);

        // Watch options on demand
        if(options.watchOptions) {
          // Watch ngOptions values before filtering for changes, drop function calls
          var watchedOptions = parsedOptions.$match[7].replace(/\|.+/, '').replace(/\(.*\)/g, '').trim();
          scope.$watch(watchedOptions, function (newValue, oldValue) {
            // console.warn('scope.$watch(%s)', watchedOptions, newValue, oldValue);
            parsedOptions.valuesFn(scope, controller).then(function (values) {
              typeahead.update(values);
              controller.$render();
            });
          }, true);
        }

        // Watch model for changes
        scope.$watch(attr.ngModel, function(newValue, oldValue) {
          // console.warn('$watch', element.attr('ng-model'), newValue);
          scope.$modelValue = newValue; // Publish modelValue on scope for custom templates
          parsedOptions.valuesFn(scope, controller)
          .then(function(values) {
            // Prevent input with no future prospect if selectMode is truthy
            // @TODO test selectMode
            if(options.selectMode && !values.length && newValue.length > 0) {
              controller.$setViewValue(controller.$viewValue.substring(0, controller.$viewValue.length - 1));
              return;
            }
            if(values.length > limit) values = values.slice(0, limit);
            var isVisible = typeahead.$isVisible();
            isVisible && typeahead.update(values);
            // Do not re-queue an update if a correct value has been selected
            if(values.length === 1 && values[0].value === newValue) return;
            !isVisible && typeahead.update(values);
            // Queue a new rendering that will leverage collection loading
            controller.$render();
          });
        });

        // modelValue -> $formatters -> viewValue
        controller.$formatters.push(function(modelValue) {
          // console.warn('$formatter("%s"): modelValue=%o (%o)', element.attr('ng-model'), modelValue, typeof modelValue);
          var displayValue = parsedOptions.displayValue(modelValue);
          return displayValue === undefined ? '' : displayValue;
        });

        // Model rendering in view
        controller.$render = function () {
          // console.warn('$render', element.attr('ng-model'), 'controller.$modelValue', typeof controller.$modelValue, controller.$modelValue, 'controller.$viewValue', typeof controller.$viewValue, controller.$viewValue);
          if(controller.$isEmpty(controller.$viewValue)) return element.val('');
          var index = typeahead.$getIndex(controller.$modelValue);
          var selected = angular.isDefined(index) ? typeahead.$scope.$matches[index].label : controller.$viewValue;
          selected = angular.isObject(selected) ? parsedOptions.displayValue(selected) : selected;
          element.val(selected ? selected.toString().replace(/<(?:.|\n)*?>/gm, '').trim() : '');
        };

        // Garbage collection
        scope.$on('$destroy', function() {
          if (typeahead) typeahead.destroy();
          options = null;
          typeahead = null;
        });

      }
    };

  }]);

})(window, document);
