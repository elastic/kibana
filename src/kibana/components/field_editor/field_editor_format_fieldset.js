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
            var $editor = $(editor);
            $el.show().html($editor);
            $compile($editor)($scope);
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
          var $editor = $el;
          var $editorScope = $scope;
          var $template = $(directive.template);
          var controller = directive.controller;
          var controllerAs = directive.controllerAs;

          if (!controller) {
            $editor = $template;
          } else {
            // create a child scope for us to mess with
            $editorScope = $scope.$new();
            childScopesToCleanup.push($editorScope);

            // assign the controller
            $editorScope.Controller = controller;

            if ($template.size() === 1) {
              // reuse the top level element
              $editor = $template;
            } else {
              $editor = $('<div>').append($template);
            }

            $editor.attr('ng-controller', 'Controller as ' + (controllerAs || 'cntrl'));
          }

          $el.show().html($editor);
          $compile($editor)($editorScope);
        }

      }
    };
  });
});
