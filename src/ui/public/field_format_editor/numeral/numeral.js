define(function (require) {
  require('ui/field_format_editor/pattern/pattern');

  require('ui/modules')
  .get('kibana')
  .directive('fieldEditorNumeral', function () {
    return {
      restrict: 'E',
      template: require('ui/field_format_editor/numeral/numeral.html')
    };
  });
});
