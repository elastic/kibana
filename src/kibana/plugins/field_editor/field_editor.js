define(function (require) {
  require('modules')
  .get('app/settings')
  .directive('fieldEditor', function (Private, Promise) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    return {
      restrict: 'E',
      template: require('text!plugins/field_editor/field_editor.html'),
      controllerAs: 'editor',
      controller: function ($sce, $scope, $attrs) {
        var self = this;

        $scope.indexPattern = $scope.$eval($attrs.indexPattern);
        $scope.field = $scope.$eval($attrs.field);

        $scope.defaultFormat = {
          display: '- default -'
        };

        self.scriptingInfo = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_info.html'));
        self.scriptingWarning = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_warning.html'));
        self.fieldFormatOptions = [$scope.defaultFormat].concat(fieldFormats.byFieldType[$scope.field.type] || []);

        self.creating = !_.contains($scope.indexPattern.fields, $scope.field);
        self.save = function () {

        };
      }
    };
  })
  .directive('fieldEditorFormatFieldset', function (Private, $compile) {
    var fieldFormats = Private(require('registry/field_formats'));

    return {
      restrict: 'A',
      require: '^fieldEditor',
      link: function ($scope, $el, attr, editor) {
        $scope.$watch('field.formatName', function (formatName) {
          var format = fieldFormats.byName[formatName];
          if (!format || !format.editor) {
            $el.empty();
          } else {
            $el.html($compile(format.editor)($scope));
          }
        });
      }
    };
  });

});
