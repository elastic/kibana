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
        self.field = shadowCopy($scope.getField());
        self.formatParams = self.field.format.params();

        // only init on first create
        self.creating = !self.indexPattern.fields.byName[self.field.name];
        self.selectedFormatId = _.get(self.indexPattern, ['fieldFormatMap', self.field.name, 'type', 'id']);
        self.defFormatType = initDefaultFormat();
        self.fieldFormatTypes = [self.defFormatType].concat(fieldFormats.byFieldType[self.field.type] || []);

        self.cancel = redirectAway;
        self.save = function () {
          var indexPattern = self.indexPattern;
          var fields = indexPattern.fields;
          var field = self.field.toActualField();

          _.remove(fields, { name: field.name });
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
          var indexPattern = self.indexPattern;
          var field = self.field;

          _.remove(indexPattern.fields, { name: field.name });
          return indexPattern.save()
          .then(function () {
            notify.info('Deleted Field "' + field.name + '"');
            redirectAway();
          });
        };

        $scope.$watch('editor.selectedFormatId', function (cur, prev) {
          var format = self.field.format;
          var changedFormat = cur !== prev;
          var missingFormat = cur && (!format || format.type.id !== cur);

          if (!changedFormat || !missingFormat) return;

          // reset to the defaults, but make sure it's an object
          self.formatParams = _.assign({}, getFieldFormatType().paramDefaults);
        });

        $scope.$watch('editor.formatParams', function () {
          var FieldFormat = getFieldFormatType();
          self.field.format = new FieldFormat(self.formatParams);
        }, true);

        // copy the defined properties of the field to a plain object
        // which is mutable, and capture the changed seperately.
        function shadowCopy(field) {
          var changes = {};
          var shadowProps = {
            toActualField: {
              // bring the shadow copy out of the shadows
              value: function toActualField() {
                return new Field(self.indexPattern, _.defaults({}, changes, field.$$spec));
              }
            }
          };

          Object.getOwnPropertyNames(field).forEach(function (prop) {
            var desc = Object.getOwnPropertyDescriptor(field, prop);
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
