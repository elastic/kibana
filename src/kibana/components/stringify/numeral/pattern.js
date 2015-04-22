define(function (require) {
  require('modules')
  .get('kibana')
  .directive('fieldEditorNumeralPattern', function () {
    return {
      restrict: 'E',
      template: require('text!components/stringify/numeral/pattern.html')
    };
  });
});
