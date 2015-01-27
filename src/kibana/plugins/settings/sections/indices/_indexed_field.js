define(function (require) {
  return function indexedFieldSetupProvider(Private, Promise) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var save = Promise.resolve();

    var DEFAULT = '- default -';

    return function ($parent, $scope, field) {
      $scope.field = field;
      $scope.defaultFormatName = fieldFormats.defaultFor(field.type).name;
      $scope.formatOptionNames = [DEFAULT].concat(
        _.pluck(fieldFormats.byFieldType[field.type], 'name')
      );
      $scope.selectedFormat = field.formatName;

      $scope.$watch('selectedFormat', function (current, prev) {
        $parent.editFormat = false;
        var selected = $scope.selectedFormat = current || DEFAULT;
        var formatName = $scope.selectedFormat === DEFAULT ? undefined : current;

        if (field.formatName !== formatName) {
          var format = fieldFormats.byName[formatName];
          return $scope.indexPattern.setFieldFormat(field, format);
        }
      });

      $scope.toggle = function () {
        if ($parent.editFormat === $scope.field.name) {
          $parent.editFormat = null;
        } else {
          $parent.editFormat = field.name;
        }
      };
    };
  };
});