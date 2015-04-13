define(function (require) {

  require('modules').get('app/settings')
  .directive('fieldEditor', function () {
    return {
      restrict: 'E',
      template: require('text!plugins/field_editor/field_editor.html'),
      controllerAs: 'fieldEditor',
      controller: function ($scope, $attrs) {
        var self = this;

        self.getIndexPattern = $scope.$getter($attrs.indexPattern);
        self.getField = $scope.$getter($attrs.field);

        // var _ = require('lodash');
        // var fieldFormats = Private(require('registry/field_formats'));
        // var save = Promise.resolve();

        // var DEFAULT = '- default -';

        // return function ($parent, $scope, field) {
        //   $scope.field = field;
        //   $scope.defaultFormatName = fieldFormats.for(field.type).name;
        //   $scope.formatOptionNames = [DEFAULT].concat(
        //     _.pluck(fieldFormats.byFieldType[field.type], 'name')
        //   );
        //   $scope.selectedFormat = field.formatName;

        //   $scope.$watch('selectedFormat', function (current, prev) {
        //     $parent.editFormat = false;
        //     var selected = $scope.selectedFormat = current || DEFAULT;
        //     var formatName = $scope.selectedFormat === DEFAULT ? undefined : current;

        //     if (field.formatName !== formatName) {
        //       var format = fieldFormats.byName[formatName];
        //       return $scope.indexPattern.setFieldFormat(field, format);
        //     }
        //   });

        //   $scope.toggle = function () {
        //     if ($parent.editFormat === $scope.field.name) {
        //       $parent.editFormat = null;
        //     } else {
        //       $parent.editFormat = field.name;
        //     }
        //   };
        // };
      }
    };
  });

});
