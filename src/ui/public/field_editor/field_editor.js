
import '../field_format_editor';
import _ from 'lodash';
import { fieldFormats } from '../registry/field_formats';
import { IndexPatternsFieldProvider } from '../index_patterns/_field';
import { uiModules } from '../modules';
import fieldEditorTemplate from './field_editor.html';
import { toastNotifications } from '../notify';
import '../directives/documentation_href';
import './field_editor.less';
import {
  GetEnabledScriptingLanguagesProvider,
  getSupportedScriptingLanguages,
  getDeprecatedScriptingLanguages
} from '../scripting_languages';
import { getKbnTypeNames } from '../../../utils';

uiModules
  .get('kibana')
  .directive('fieldEditor', function (Private, $sce, confirmModal, config) {
    const getConfig = (...args) => config.get(...args);

    const Field = Private(IndexPatternsFieldProvider);
    const getEnabledScriptingLanguages = Private(GetEnabledScriptingLanguagesProvider);

    const fieldTypesByLang = {
      painless: ['number', 'string', 'date', 'boolean'],
      expression: ['number'],
      default: getKbnTypeNames()
    };

    return {
      restrict: 'E',
      template: fieldEditorTemplate,
      scope: {
        getIndexPattern: '&indexPattern',
        getField: '&field'
      },
      controllerAs: 'editor',
      controller: function ($scope, kbnUrl) {
        const self = this;

        getScriptingLangs().then((langs) => {
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

          const index = fields.findIndex(f => f.name === field.name);
          if (index > -1) {
            fields.splice(index, 1, field);
          } else {
            fields.push(field);
          }

          if (!self.selectedFormatId) {
            delete indexPattern.fieldFormatMap[field.name];
          } else {
            indexPattern.fieldFormatMap[field.name] = self.field.format;
          }

          return indexPattern.save()
            .then(function () {
              toastNotifications.addSuccess(`Saved '${self.field.name}'`);
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
                toastNotifications.addSuccess(`Deleted '${self.field.name}'`);
                redirectAway();
              });
          }
          const confirmModalOptions = {
            confirmButtonText: 'Delete',
            onConfirm: doDelete,
            title: `Delete field '${self.field.name}'?`
          };
          confirmModal(
            `You can't recover a deleted field.`,
            confirmModalOptions
          );
        };

        self.isDeprecatedLang = function (lang) {
          return _.contains(getDeprecatedScriptingLanguages(), lang);
        };

        $scope.$watch('editor.selectedFormatId', function (cur, prev) {
          const format = self.field.format;
          const changedFormat = cur !== prev;
          const missingFormat = cur && (!format || format.type.id !== cur);

          if (!changedFormat || !missingFormat) return;

          // reset to the defaults, but make sure it's an object
          const FieldFormat = getFieldFormatType();
          const paramDefaults = new FieldFormat({}, getConfig).getParamDefaults();
          self.formatParams = _.assign({}, _.cloneDeep(paramDefaults));
        });

        $scope.$watch('editor.formatParams', function () {
          const FieldFormat = getFieldFormatType();
          self.field.format = new FieldFormat(self.formatParams, getConfig);
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

        function getScriptingLangs() {
          return getEnabledScriptingLanguages()
            .then((enabledLanguages) => {
              return _.intersection(enabledLanguages, _.union(getSupportedScriptingLanguages(), getDeprecatedScriptingLanguages()));
            });
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
