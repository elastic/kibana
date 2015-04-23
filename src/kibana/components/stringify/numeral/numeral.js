define(function (require) {
  require('components/stringify/pattern/pattern');

  require('modules')
  .get('kibana')
  .directive('fieldEditorNumeralPattern', function () {
    return {
      restrict: 'E',
      template: require('text!components/stringify/numeral/numeral.html')
    };
  });
});
