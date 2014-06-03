'use strict';
/**
 * Binds a ACE Editor widget
 */
angular.module('ui.ace', []).constant('uiAceConfig', {}).directive('uiAce', [
  'uiAceConfig',
  function (uiAceConfig) {
    if (angular.isUndefined(window.ace)) {
      throw new Error('ui-ace need ace to work... (o rly?)');
    }
    /**
     * Sets editor options such as the wrapping mode or the syntax checker.
     *
     * The supported options are:
     *
     *   <ul>
     *     <li>showGutter</li>
     *     <li>useWrapMode</li>
     *     <li>onLoad</li>
     *     <li>theme</li>
     *     <li>mode</li>
     *   </ul>
     *
     * @param acee
     * @param session ACE editor session
     * @param {object} opts Options to be set
     */
    var setOptions = function (acee, session, opts) {
      // Boolean options
      if (angular.isDefined(opts.showGutter)) {
        acee.renderer.setShowGutter(opts.showGutter);
      }
      if (angular.isDefined(opts.useWrapMode)) {
        session.setUseWrapMode(opts.useWrapMode);
      }
      if (angular.isDefined(opts.showInvisibles)) {
        acee.renderer.setShowInvisibles(opts.showInvisibles);
      }
      if (angular.isDefined(opts.showIndentGuides)) {
        acee.renderer.setDisplayIndentGuides(opts.showIndentGuides);
      }
      if (angular.isDefined(opts.useSoftTabs)) {
        session.setUseSoftTabs(opts.useSoftTabs);
      }
      // commands
      if (angular.isDefined(opts.disableSearch) && opts.disableSearch) {
        acee.commands.addCommands([{
            name: 'unfind',
            bindKey: {
              win: 'Ctrl-F',
              mac: 'Command-F'
            },
            exec: function () {
              return false;
            },
            readOnly: true
          }]);
      }
      // onLoad callback
      if (angular.isFunction(opts.onLoad)) {
        opts.onLoad(acee);
      }
      // Basic options
      if (angular.isString(opts.theme)) {
        acee.setTheme('ace/theme/' + opts.theme);
      }
      if (angular.isString(opts.mode)) {
        session.setMode('ace/mode/' + opts.mode);
      }
    };
    return {
      restrict: 'EA',
      require: '?ngModel',
      link: function (scope, elm, attrs, ngModel) {
        /**
         * Corresponds the uiAceConfig ACE configuration.
         * @type object
         */
        var options = uiAceConfig.ace || {};
        /**
         * uiAceConfig merged with user options via json in attribute or data binding
         * @type object
         */
        var opts = angular.extend({}, options, scope.$eval(attrs.uiAce));
        /**
         * ACE editor
         * @type object
         */
        var acee = window.ace.edit(elm[0]);
        /**
         * ACE editor session.
         * @type object
         * @see [EditSession]{@link http://ace.c9.io/#nav=api&api=edit_session}
         */
        var session = acee.getSession();
        /**
         * Reference to a change listener created by the listener factory.
         * @function
         * @see listenerFactory.onChange
         */
        var onChangeListener;
        /**
         * Reference to a blur listener created by the listener factory.
         * @function
         * @see listenerFactory.onBlur
         */
        var onBlurListener;
        /**
         * Calls a callback by checking its existing. The argument list
         * is variable and thus this function is relying on the arguments
         * object.
         * @throws {Error} If the callback isn't a function
         */
        var executeUserCallback = function () {
          /**
           * The callback function grabbed from the array-like arguments
           * object. The first argument should always be the callback.
           *
           * @see [arguments]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/arguments}
           * @type {*}
           */
          var callback = arguments[0];
          /**
           * Arguments to be passed to the callback. These are taken
           * from the array-like arguments object. The first argument
           * is stripped because that should be the callback function.
           *
           * @see [arguments]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/arguments}
           * @type {Array}
           */
          var args = Array.prototype.slice.call(arguments, 1);
          if (angular.isDefined(callback)) {
            scope.$apply(function () {
              if (angular.isFunction(callback)) {
                callback(args);
              } else {
                throw new Error('ui-ace use a function as callback.');
              }
            });
          }
        };
        /**
         * Listener factory. Until now only change listeners can be created.
         * @type object
         */
        var listenerFactory = {
            onChange: function (callback) {
              return function (e) {
                var newValue = session.getValue();
                if (newValue !== scope.$eval(attrs.value) && !scope.$$phase && !scope.$root.$$phase) {
                  if (angular.isDefined(ngModel)) {
                    scope.$apply(function () {
                      ngModel.$setViewValue(newValue);
                    });
                  }
                  executeUserCallback(callback, e, acee);
                }
              };
            },
            onBlur: function (callback) {
              return function () {
                executeUserCallback(callback, acee);
              };
            }
          };
        attrs.$observe('readonly', function (value) {
          acee.setReadOnly(value === 'true');
        });
        // Value Blind
        if (angular.isDefined(ngModel)) {
          ngModel.$formatters.push(function (value) {
            if (angular.isUndefined(value) || value === null) {
              return '';
            } else if (angular.isObject(value) || angular.isArray(value)) {
              throw new Error('ui-ace cannot use an object or an array as a model');
            }
            return value;
          });
          ngModel.$render = function () {
            session.setValue(ngModel.$viewValue);
          };
        }
        // set the options here, even if we try to watch later, if this
        // line is missing things go wrong (and the tests will also fail)
        setOptions(acee, session, opts);
        // Listen for option updates
        scope.$watch(attrs.uiAce, function () {
          opts = angular.extend({}, options, scope.$eval(attrs.uiAce));
          // unbind old change listener
          session.removeListener('change', onChangeListener);
          // bind new change listener
          onChangeListener = listenerFactory.onChange(opts.onChange);
          session.on('change', onChangeListener);
          // unbind old blur listener
          //session.removeListener('blur', onBlurListener);
          acee.removeListener('blur', onBlurListener);
          // bind new blur listener
          onBlurListener = listenerFactory.onBlur(opts.onBlur);
          acee.on('blur', onBlurListener);
          setOptions(acee, session, opts);
        }, true);
        // EVENTS
        onChangeListener = listenerFactory.onChange(opts.onChange);
        session.on('change', onChangeListener);
        onBlurListener = listenerFactory.onBlur(opts.onBlur);
        acee.on('blur', onBlurListener);
        elm.on('$destroy', function () {
          acee.session.$stopWorker();
          acee.destroy();
        });
        scope.$watch(function () {
          return [
            elm[0].offsetWidth,
            elm[0].offsetHeight
          ];
        }, function () {
          acee.resize();
          acee.renderer.updateFull();
        }, true);
      }
    };
  }
]);