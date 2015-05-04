define(function (require) {
  require('components/field_format_editor/pattern/pattern');

  require('modules')
  .get('kibana')
  .directive('fieldEditorNumeral', function () {
    return {
      restrict: 'E',
      template: require('text!components/field_format_editor/numeral/numeral.html')
    };
  });
});
