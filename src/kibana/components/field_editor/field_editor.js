define(function (require) {

  require('components/field_format_editor/field_format_editor');

  require('modules')
  .get('kibana')
  .directive('fieldEditor', function (Private, $sce) {
    var _ = require('lodash');
    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    var scriptingInfo = $sce.trustAsHtml(require('text!components/field_editor/scripting_info.html'));
    var scriptingWarning = $sce.trustAsHtml(require('text!components/field_editor/scripting_warning.html'));

    return {
      restrict: 'E',
      template: require('text!components/field_editor/field_editor.html'),
      scope: {
        getIndexPattern: '&indexPattern',
        getField: '&field'
      },
      controllerAs: 'editor',
      controller: function ($scope, Notifier, kbnUrl) {
        var self = this;
        var notify = new Notifier({ location: 'Field Editor' });

        self.scriptingInfo = scriptingInfo;
        self.scriptingWarning = scriptingWarning;

        self.indexPattern = $scope.getIndexPattern();
        self.fieldProps = Object.create($scope.getField().$$spec);
        createField();
        self.formatParams = self.field.format.params();

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
            indexPattern.fieldFormatMap[field.name] = self.format;
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
          '=editor.fieldProps'
        ], function (cur, prev) {
          var changedFormat = cur[0] !== prev[0];
          var missingFormat = cur[0] && (!self.format || self.format.type.id !== cur[0]);
          var changedParams = cur[1] !== prev[1];
          var FieldFormat = getFieldFormatType();

          if (changedFormat) {
            // the old params are no longer valid
            self.formatParams = {};
          }

          if (!changedParams && (changedFormat || missingFormat)) {
            self.formatParams = _.defaults(self.formatParams || {}, FieldFormat.paramDefaults);
            if (!_.isEqual(self.formatParams, cur[1])) return;
          }

          if (changedParams || changedFormat || missingFormat) {
            if (self.selectedFormatId) {
              self.format = new FieldFormat(self.formatParams);
              self.formatParams = self.format.params();
            } else {
              self.format = undefined;
            }
          }

          createField();
        });

        function createField() {
          var first = !self.field;
          var spec = _.assign(Object.create(self.fieldProps), { format: self.format });
          self.field = new Field(self.indexPattern, spec);

          if (!first) return;
          // only init on first create
          self.creating = !self.indexPattern.fields.byName[self.field.name];
          self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
          if (self.selectedFormatId) self.format = self.field.format;
          self.defFormatType = initDefaultFormat();
          self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);
        }

        function getFieldFormatType() {
          if (self.selectedFormatId) return fieldFormats.getType(self.selectedFormatId);
          else return fieldFormats.getDefaultType(self.field.type);
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
