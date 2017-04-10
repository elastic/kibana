import 'ui/field_format_editor';
import 'angular-bootstrap-colorpicker';
import 'angular-bootstrap-colorpicker/css/colorpicker.css';
import _ from 'lodash';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import IndexPatternsFieldProvider from 'ui/index_patterns/_field';
import uiModules from 'ui/modules';
import fieldEditorTemplate from 'ui/field_editor/field_editor.html';
import IndexPatternsCastMappingTypeProvider from 'ui/index_patterns/_cast_mapping_type';
import { scriptedFields as docLinks } from '../documentation_links/documentation_links';
import './field_editor.less';
import { GetEnabledScriptingLangsProvider, getSupportedScriptingLangs } from '../scripting_langs';

uiModules
.get('kibana', ['colorpicker.module'])
.directive('fieldEditor', function (Private, $sce, confirmModal) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const Field = Private(IndexPatternsFieldProvider);
  const getEnabledScriptingLangs = Private(GetEnabledScriptingLangsProvider);

  const fieldTypesByLang = {
    painless: ['number', 'string', 'date', 'boolean'],
    expression: ['number'],
    default: _.keys(Private(IndexPatternsCastMappingTypeProvider).types.byType)
  };

  return {
    restrict: 'E',
    template: fieldEditorTemplate,
    scope: {
      getIndexPattern: '&indexPattern',
      getField: '&field'
    },
    controllerAs: 'editor',
    controller: function ($scope, Notifier, kbnUrl) {
      const self = this;
      const notify = new Notifier({ location: 'Field Editor' });

      self.docLinks = docLinks;
      getEnabledScriptingLangs().then((langs) => {
        self.scriptingLangs = langs;
        if (!_.includes(self.scriptingLangs, self.field.lang)) {
          self.field.lang = undefined;
        }
      });

      self.indexPattern = $scope.getIndexPattern();
      self.field = shadowCopy($scope.getField());
      self.formatParams = self.field.format.params();
      self.conflictDescriptionsLength = (self.field.conflictDescriptions) ? Object.keys(self.field.conflictDescriptions).length : 0;

      // only init on first create
      self.creating = !self.indexPattern.fields.byName[self.field.name];
      self.existingFieldNames = self.indexPattern.fields.map(field => field.name); //used for mapping conflict validation
      self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
      self.defFormatType = initDefaultFormat();

      self.cancel = redirectAway;
      self.save = function () {
        const indexPattern = self.indexPattern;
        const fields = indexPattern.fields;
        const field = self.field.toActualField();

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
        function doDelete() {
          const indexPattern = self.indexPattern;
          const field = self.field;

          indexPattern.fields.remove({ name: field.name });
          return indexPattern.save()
            .then(function () {
              notify.info('Deleted Field "' + field.name + '"');
              redirectAway();
            });
        }
        const confirmModalOptions = {
          confirmButtonText: 'Delete field',
          onConfirm: doDelete
        };
        confirmModal(
          `Are you sure want to delete '${self.field.name}'? This action is irreversible!`,
          confirmModalOptions
        );
      };

      self.isSupportedLang = function (lang) {
        return _.contains(getSupportedScriptingLangs(), lang);
      };

      $scope.$watch('editor.selectedFormatId', function (cur, prev) {
        const format = self.field.format;
        const changedFormat = cur !== prev;
        const missingFormat = cur && (!format || format.type.id !== cur);

        if (!changedFormat || !missingFormat) return;

        // reset to the defaults, but make sure it's an object
        self.formatParams = _.assign({}, _.cloneDeep(getFieldFormatType().paramDefaults));
      });

      $scope.$watch('editor.formatParams', function () {
        const FieldFormat = getFieldFormatType();
        self.field.format = new FieldFormat(self.formatParams);
      }, true);

      $scope.$watch('editor.field.type', function (newValue) {
        self.defFormatType = initDefaultFormat();
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[newValue] || []);

        if (_.isUndefined(_.find(self.fieldFormatTypes, { id: self.selectedFormatId }))) {
          delete self.selectedFormatId;
        }
      });

      $scope.$watch('editor.field.lang', function (newValue) {
        self.fieldTypes = _.get(fieldTypesByLang, newValue, fieldTypesByLang.default);

        if (!_.contains(self.fieldTypes, self.field.type)) {
          self.field.type = _.first(self.fieldTypes);
        }
      });

      // copy the defined properties of the field to a plain object
      // which is mutable, and capture the changed seperately.
      function shadowCopy(field) {
        const changes = {};
        const shadowProps = {
          toActualField: {
            // bring the shadow copy out of the shadows
            value: function toActualField() {
              return new Field(self.indexPattern, _.defaults({}, changes, field.$$spec));
            }
          }
        };

        Object.getOwnPropertyNames(field).forEach(function (prop) {
          const desc = Object.getOwnPropertyDescriptor(field, prop);
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
        const def = Object.create(fieldFormats.getDefaultType(self.field.type));

        // explicitly set to undefined to prevent inheritting the prototypes id
        def.id = undefined;
        def.resolvedTitle = def.title;
        def.title = '- default - ';

        return def;
      }
    }
  };
});
