define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('modules')
  .get('app/settings')
  .directive('fieldEditorFormatFieldset', function (Private, $compile) {
    return {
      restrict: 'A',
      require: '^fieldEditor',
      link: function ($scope, $el) {
        var childScopesToCleanup = [];

        $scope.$watch('editor.selectedFormatId && editor.field.format.type', function (FieldFormat) {
          var editor = FieldFormat && FieldFormat.editor;
          _.invoke(childScopesToCleanup.splice(0), '$destroy');

          if (!editor) {
            $el.hide().empty();
            return;
          }

          if (typeof editor === 'string') {
            $el.show().html($compile(editor)($scope));
            return;
          }

          if (_.isPlainObject(editor)) {
            customDirectiveInit($el, editor);
            return;
          }
        });


        /**
         * Compile a subset of the directive definition object
         * API as if it was a directive found in the angular compilation
         * process.
         *
         * Supported options:
         *   - template
         *   - controller
         *   - controllerAs
         *
         * more options will be supported as needed.
         *
         * @param  {angular.element} $el - template
         * @param  {object} directiveDef - the directive definition object
         * @return {undefined}
         */
        function customDirectiveInit($el, directive) {
          var $target = $el;
          var $targetScope = $scope;
          var $template = $(directive.template);
          var controller = directive.controller;
          var controllerAs = directive.controllerAs;

          if (!controller) {
            $target.html($template);
          } else {
            // create a child scope for us to fuck with
            $targetScope = $scope.$new();
            childScopesToCleanup.push($targetScope);

            // assign the controller
            $targetScope.Controller = controller;

            if ($template.size() === 1) {
              // reuse the top level element
              $target = $template;
            } else {
              $target = $('<div>').append($template);
            }

            $target.attr('ng-controller', 'Controller as ' + (controllerAs || 'cntrl'));
          }


          $el.show().html($compile($target)($targetScope));
        }

      }
    };
  });
});
