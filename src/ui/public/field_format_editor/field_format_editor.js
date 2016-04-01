define(function (require) {
  let _ = require('lodash');
  let $ = require('jquery');

  require('ui/modules')
  .get('app/settings')
  .directive('fieldFormatEditor', function (Private, $compile) {
    return {
      restrict: 'A',
      scope: {
        getField: '&field',
        getFormatParams: '&formatParams'
      },
      controllerAs: 'editor',
      controller: function ($scope) {
        let self = this;

        // bind the scope values to the controller, down with $scope.values
        $scope.editor = this;
        $scope.$bind('editor.field', 'getField()', $scope);
        $scope.$bind('editor.formatParams', 'getFormatParams()', $scope);

        /**
         * Read the FieldFormat's editor property and convert it into
         * a "pseudoDirective". For clarity I'm reusing the directive def
         * object api, but for simplicity not implementing the entire thing.
         *
         * possible configs:
         *   string:
         *     - used as an angular template
         *   directive def object, with support for the following opts:
         *     - template
         *     - compile or link
         *     - scope (creates isolate, reads from parent scope, not attributes)
         *     - controller
         *     - controllerAs
         *
         * @param  {angular.element} $el - template
         * @param  {object} directiveDef - the directive definition object
         * @return {undefined}
         */
        $scope.$watch('editor.field.format.type', function (FieldFormat) {
          let opts = FieldFormat && FieldFormat.editor;

          if (!opts) {
            delete self.$$pseudoDirective;
            return;
          }

          if (typeof opts === 'string') {
            self.$$pseudoDirective = {
              template: opts
            };
            return;
          }

          self.$$pseudoDirective = {
            template: opts.template,
            compile: opts.compile || function () {
              return opts.link;
            },
            scope: opts.scope || false,
            controller: opts.controller,
            controllerAs: opts.controllerAs
          };
        });

      },
      link: function ($scope, $el) {
        let scopesToTeardown = [];

        function setupScope(opts) {
          if (typeof opts !== 'object') {
            return scopesToTeardown[scopesToTeardown.push($scope.$new()) - 1];
          }

          let isolate = scopesToTeardown[scopesToTeardown.push($scope.$new(true)) - 1];
          _.forOwn(opts, function (from, to) {
            isolate.$bind(to, from, $scope);
          });
          return isolate;
        }

        $scope.$watch('editor.$$pseudoDirective', function (directive) {
          $el.empty();
          _.invoke(scopesToTeardown.splice(0), '$destroy');

          if (!directive) return $el.hide();
          else $el.show();

          let askedForChild = !!directive.scope;
          let reuseScope = !askedForChild && !directive.controller;

          let $formatEditor = $('<div>').html(directive.template);
          let $formatEditorScope = reuseScope ? $scope : setupScope(directive.scope);

          if (directive.controller) {
            // bind the controller to the injected element
            let cntrlAs = (directive.controllerAs ? ' as ' + directive.controllerAs : '');
            $formatEditorScope.Controller = directive.controller;
            $formatEditor.attr('ng-controller', 'Controller' + cntrlAs);
          }

          let attrs = {};
          let linkFns = directive.compile && directive.compile($el, attrs);
          if (!linkFns || _.isFunction(linkFns)) {
            linkFns = {
              pre: _.noop,
              post: linkFns || _.noop
            };
          }

          $el.html($formatEditor);
          linkFns.pre($formatEditorScope, $formatEditor, attrs);
          $compile($formatEditor)($formatEditorScope);
          linkFns.post($formatEditorScope, $formatEditor, attrs);
        });

      }
    };
  });
});
