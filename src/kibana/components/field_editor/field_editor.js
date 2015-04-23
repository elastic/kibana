define(function (require) {

  require('components/field_editor/field_editor_format_fieldset');

  require('modules')
  .get('app/settings')
  .directive('fieldEditor', function (Private) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    return {
      restrict: 'E',
      template: require('text!components/field_editor/field_editor.html'),
      controllerAs: 'editor',
      controller: function ($sce, $scope, $attrs, Notifier, kbnUrl) {
        var self = this;
        var notify = new Notifier({ location: 'Field Editor' });

        self.indexPattern = $scope.$eval($attrs.indexPattern);
        self.fieldSpec = Object.create($scope.$eval($attrs.field).$$spec);
        self.field = mutatedField();

        self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
        self.formatParams = self.field.format.params();
        self.defFormatType = initDefaultFormat();

        self.scriptingInfo = $sce.trustAsHtml(require('text!components/field_editor/scripting_info.html'));
        self.scriptingWarning = $sce.trustAsHtml(require('text!components/field_editor/scripting_warning.html'));
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);

        self.creating = !self.indexPattern.fields.byName[self.field.name];

        self.cancel = function () {
          kbnUrl.change(self.indexPattern.editRoute);
        };

        self.save = function () {
          var indexPattern = self.indexPattern;
          var fields = indexPattern.fields;
          var field = self.field;

          if (fields.byName[field.name]) {
            var index = _.findIndex(fields, { name: field.name });
            fields.splice(index, 1, field);
          } else {
            fields.push(field);
          }

          if (!self.selectedFormatId) {
            delete indexPattern.fieldFormatMap[field.name];
          } else {
            indexPattern.fieldFormatMap[field.name] = field.format;
          }

          return indexPattern.save()
          .then(function () {
            notify.info('Saved Field "' + self.field.name + '"');
            kbnUrl.change(self.indexPattern.editRoute);
          });
        };

        $scope.$watchMulti([
          'editor.selectedFormatId',
          '=editor.formatParams',
          '=editor.fieldSpec'
        ], function (cur, prev) {
          var formatId = cur[0];
          var updatedFormat = cur[0] !== prev[0];

          if (updatedFormat) {
            var FieldFormat = fieldFormats.byId[formatId];
            self.formatParams = _.cloneDeep(FieldFormat.paramDefaults);
            self.fieldSpec.format = FieldFormat && new FieldFormat(self.formatParams);
          }

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
