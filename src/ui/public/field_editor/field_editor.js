import 'ui/field_format_editor';
import 'angular-bootstrap-colorpicker';
import 'angular-bootstrap-colorpicker/css/colorpicker.css';
import _ from 'lodash';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import IndexPatternsFieldProvider from 'ui/index_patterns/_field';
import uiModules from 'ui/modules';
import fieldEditorTemplate from 'ui/field_editor/field_editor.html';


uiModules
.get('kibana', ['colorpicker.module'])
.directive('fieldEditor', function (Private, $sce) {
  let fieldFormats = Private(RegistryFieldFormatsProvider);
  let Field = Private(IndexPatternsFieldProvider);
  let scriptingInfo = $sce.trustAsHtml(require('ui/field_editor/scripting_info.html'));
  let scriptingWarning = $sce.trustAsHtml(require('ui/field_editor/scripting_warning.html'));

  return {
    restrict: 'E',
    template: fieldEditorTemplate,
    scope: {
      getIndexPattern: '&indexPattern',
      getField: '&field'
    },
    controllerAs: 'editor',
    controller: function ($scope, Notifier, kbnUrl) {
      let self = this;
      let notify = new Notifier({ location: 'Field Editor' });

      self.scriptingInfo = scriptingInfo;
      self.scriptingWarning = scriptingWarning;

      self.indexPattern = $scope.getIndexPattern();
      self.field = shadowCopy($scope.getField());
      self.formatParams = self.field.format.params();

      // only init on first create
      self.creating = !self.indexPattern.fields.byName[self.field.name];
      self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
      self.defFormatType = initDefaultFormat();
      self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);

      self.cancel = redirectAway;
      self.save = function () {
        let indexPattern = self.indexPattern;
        let fields = indexPattern.fields;
        let field = self.field.toActualField();

        fields.remove({ name: field.name });
        fields.push(field);

        if (!self.selectedFormatId) {
          delete indexPattern.fieldFormatMap[field.name];
        } else {
          indexPattern.fieldFormatMap[field.name] = self.field.format;
        }

        return indexPattern.save()
        .then(function () {
          notify.info('Saved Field "' + self.field.name + '"');
          redirectAway();
        });
      };

      self.delete = function () {
        let indexPattern = self.indexPattern;
        let field = self.field;

        indexPattern.fields.remove({ name: field.name });
        return indexPattern.save()
        .then(function () {
          notify.info('Deleted Field "' + field.name + '"');
          redirectAway();
        });
      };

      $scope.$watch('editor.selectedFormatId', function (cur, prev) {
        let format = self.field.format;
        let changedFormat = cur !== prev;
        let missingFormat = cur && (!format || format.type.id !== cur);

        if (!changedFormat || !missingFormat) return;

        // reset to the defaults, but make sure it's an object
        self.formatParams = _.assign({}, _.cloneDeep(getFieldFormatType().paramDefaults));
      });

      $scope.$watch('editor.formatParams', function () {
        let FieldFormat = getFieldFormatType();
        self.field.format = new FieldFormat(self.formatParams);
      }, true);

      // copy the defined properties of the field to a plain object
      // which is mutable, and capture the changed seperately.
      function shadowCopy(field) {
        let changes = {};
        let shadowProps = {
          toActualField: {
            // bring the shadow copy out of the shadows
            value: function toActualField() {
              return new Field(self.indexPattern, _.defaults({}, changes, field.$$spec));
            }
          }
        };

        Object.getOwnPropertyNames(field).forEach(function (prop) {
          let desc = Object.getOwnPropertyDescriptor(field, prop);
          shadowProps[prop] = {
            enumerable: desc.enumerable,
            get: function () {
              return _.has(changes, prop) ? changes[prop] : field[prop];
            },
            set: function (v) {
              changes[prop] = v;
            }
          };
        });

        return Object.create(null, shadowProps);
      }

      function redirectAway() {
        kbnUrl.changeToRoute(self.indexPattern, self.field.scripted ? 'scriptedFields' : 'indexedFields');
      }

      function getFieldFormatType() {
        if (self.selectedFormatId) return fieldFormats.getType(self.selectedFormatId);
        else return fieldFormats.getDefaultType(self.field.type);
      }

      function initDefaultFormat() {
        let def = Object.create(fieldFormats.getDefaultType(self.field.type));

        // explicitly set to undefined to prevent inheritting the prototypes id
        def.id = undefined;
        def.resolvedTitle = def.title;
        def.title = '- default - ';

        return def;
      }
    }
  };
});
