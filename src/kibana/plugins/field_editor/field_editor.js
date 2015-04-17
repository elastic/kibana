define(function (require) {

  require('plugins/field_editor/field_editor_format_fieldset');

  require('modules')
  .get('app/settings')
  .directive('fieldEditor', function (Private) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    return {
      restrict: 'E',
      template: require('text!plugins/field_editor/field_editor.html'),
      controllerAs: 'editor',
      controller: function ($sce, $scope, $attrs) {
        var self = this;

        self.indexPattern = $scope.$eval($attrs.indexPattern);
        self.fieldSpec = Object.create($scope.$eval($attrs.field).$$spec);
        self.field = mutatedField();

        self.formatParams = self.field.format.params() || {};
        self.defFormatType = initDefaultFormat();

        self.scriptingInfo = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_info.html'));
        self.scriptingWarning = $sce.trustAsHtml(require('text!plugins/field_editor/scripting_warning.html'));
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);

        self.creating = !self.indexPattern.fields.byName[self.field.name];

        self.cancel = function () {
          window.history.back();
        };

        self.save = function () {

        };

        $scope.$watchMulti([
          'editor.selectedFormatId',
          '=editor.formatParams'
        ], function (cur) {
          var id = cur[0];
          var field = self.field;
          var FieldFormat = fieldFormats.byId[id];
          var newFormat = FieldFormat && !(field.format instanceof FieldFormat);
          var resetFormat = (!id || newFormat);
          var resetParams = resetFormat && _.size(self.formatParams) > 0;

          if (resetParams) {
            // clear the params, which will cause another trigger
            self.formatParams = {};
            return;
          }

          self.fieldSpec.format = FieldFormat && new FieldFormat(self.formatParams);
          self.field = mutatedField();
        });

        function mutatedField() {
          return new Field(self.indexPattern, self.fieldSpec);
        }

        function initDefaultFormat() {
          var prototype = fieldFormats.for(self.field.type).type;
          var def = Object.create(prototype);

          // explicitly set to undefined to prevent inheritting the prototypes id
          def.id = undefined;
          def.resolvedTitle = def.title;
          def.title = '- default - ';

          return def;
        }
      }
    };
  });

});
