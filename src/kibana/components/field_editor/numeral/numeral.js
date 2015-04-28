define(function (require) {
  require('components/field_editor/pattern/pattern');

  require('modules')
  .get('kibana')
  .directive('fieldEditorNumeralPattern', function () {
    return {
      restrict: 'E',
      template: require('text!components/field_editor/numeral/numeral.html')
    };
  });
});
