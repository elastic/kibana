define(function (require) {

  require('plugins/field_editor/field_editor_format_fieldset');

  require('modules')
  .get('app/settings')
  .directive('fieldEditor', function (Private) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));

    return {
      restrict: 'E',
      template: require('text!plugins/field_editor/field_editor.html'),
      controllerAs: 'editor',
      controller: function ($sce, $scope, $attrs) {
        var self = this;

        $scope.indexPattern = $scope.$eval($attrs.indexPattern);
        $scope.field = $scope.$eval($attrs.field);

        $scope.formatParams = $scope.field.format.params() || {};
        $scope.defFormatType = initDefaultFormat($scope.field);

        self.scriptingInfo = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_info.html'));
        self.scriptingWarning = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_warning.html'));
        self.fieldFormatTypes = [$scope.defFormatType].concat(fieldFormats.byFieldType[$scope.field.type] || []);

        self.creating = !_.contains($scope.indexPattern.fields, $scope.field);
        self.cancel = function () {

        };

        self.save = function () {

        };

        var format;
        self.getFormat = function () { return format; };
        self.getSelectedFormatId = function () { return self.selectedFormatId; };
        $scope.$watchMulti([
          self.getSelectedFormatId,
          '=formatParams'
        ], function (cur) {
          var id = cur[0];

          if (!id) {
            format = undefined;
            return;
          }

          var FieldFormat = fieldFormats.byId[id];
          if (!(format instanceof FieldFormat)) {
            $scope.formatParams = {};
          }

          format = new FieldFormat($scope.formatParams);
        });
      }
    };

    function initDefaultFormat(field) {
      var prototype = fieldFormats.for(field.type).type;
      var def = Object.create(prototype);

      // explicitly set to undefined to prevent inheritting the prototypes id
      def.id = undefined;
      def.resolvedTitle = def.title;
      def.title = '- default - ';

      return def;
    }
  });

});
