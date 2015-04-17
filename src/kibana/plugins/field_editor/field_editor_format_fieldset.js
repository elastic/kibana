define(function (require) {

  require('modules')
  .get('app/settings')
  .directive('fieldEditorFormatFieldset', function (Private, $compile) {
    return {
      restrict: 'A',
      require: '^fieldEditor',
      scope: true,
      link: function ($scope, $el, attrs, editor) {
        $scope.$bind('params', 'formatParams');
        $scope.$bind('field', 'field');
        $scope.$bind('format', 'field.format');
        $scope.$bind('FieldFormat', 'field.format.type');

        $scope.$watch(editor.getFormat, function (format) {
          var editor = format && format.type && format.type.editor;
          if (!editor) {
            $el.hide().empty();
          } else {
            $el.show().html($compile(editor)($scope));
          }
        });

      }
    };
  });
});
