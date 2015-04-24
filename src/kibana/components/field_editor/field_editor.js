define(function (require) {

  require('components/field_editor/field_editor_format_fieldset');

  require('modules')
  .get('kibana')
  .directive('fieldEditor', function (Private) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    return {
      restrict: 'E',
      template: require('text!components/field_editor/field_editor.html'),
      scope: {
        getIndexPattern: '&indexPattern',
        getField: '&field'
      },
      controllerAs: 'editor',
      controller: function ($sce, $scope, Notifier, kbnUrl) {
        var self = this;
        var notify = new Notifier({ location: 'Field Editor' });

        self.indexPattern = $scope.getIndexPattern();
        self.fieldSpec = Object.create($scope.getField().$$spec);
        self.field = mutatedField();
        self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
        self.formatParams = self.field.format.params();
        self.defFormatType = initDefaultFormat();
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);
        self.creating = !self.indexPattern.fields.byName[self.field.name];


        self.scriptingInfo = $sce.trustAsHtml(require('text!components/field_editor/scripting_info.html'));
        self.scriptingWarning = $sce.trustAsHtml(require('text!components/field_editor/scripting_warning.html'));

        self.cancel = function () {
          kbnUrl.change(self.indexPattern.editRoute);
        };

        self.save = function () {
          var indexPattern = self.indexPattern;
          var fields = indexPattern.fields;
          var field = self.field;

          _.remove(fields, { name: field.name });
          fields.push(field);

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

        self.delete = function () {
          var indexPattern = self.indexPattern;
          var field = self.field;

          _.remove(indexPattern.fields, { name: field.name });
          return indexPattern.save()
          .then(function () {
            notify.info('Deleted Field "' + field.name + '"');
            kbnUrl.change(indexPattern.editRoute);
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
          var def = Object.create(fieldFormats.getDefaultType(self.field.type));

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
