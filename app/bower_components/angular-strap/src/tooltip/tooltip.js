'use strict';

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

    this.$get = function($window, $rootScope, $compile, $q, $templateCache, $http, $animate, $sce, dimensions, $$rAF, $timeout) {

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

    };

  })

  .directive('bsTooltip', function($window, $location, $sce, $tooltip, $$rAF) {

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

  });
