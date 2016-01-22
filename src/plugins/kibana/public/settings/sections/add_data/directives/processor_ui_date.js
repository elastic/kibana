const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const selectableArray = require('../lib/selectable_array');

require('../lib/processor_type_registry').register({
  typeId: 'date',
  title: 'Date',
  sourceField: '',
  targetField: '@timestamp',
  formats: [],
  timezone: 'UTC',
  locale: 'ENGLISH',
  customFormat: '',
  getDefinition: function() {
    const self = this;

    const formats = [];
    self.formats.forEach((format) => {
      if (format === 'Custom') {
        if (self.customFormat) {
          formats.push(self.customFormat);
        }
      } else {
        formats.push(format);
      }
    });

    return {
      'date' : {
        'processor_id': self.processorId,
        'match_field' : self.sourceField ? self.sourceField : '',
        'target_field' : self.targetField ? self.targetField : '',
        'match_formats' : formats,
        'timezone': self.timezone ? self.timezone : '',
        'locale': self.locale ? self.locale : ''
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    const target = (self.targetField) ? self.targetField : '?';
    return `[${source}] -> [${target}]`;
  }
});

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiDate', function() {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_date.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function consumeNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        pipeline.dirty = true;
      }

      function updateFormats() {
        const selectedFormats = $scope.formats.map((o) => {
          if (!o.selected) return;
          return o.title;
        });
        processor.formats = _.compact(selectedFormats);

        $scope.customFormatSelected = !_.isUndefined(_.find(processor.formats, (o) => {
          return o === 'Custom';
        }));
        processorUiChanged();
      }
      updateFormats = debounce(updateFormats, 200);

      $scope.formats = selectableArray(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom'], processor.formats);
      $scope.timezones = ['UTC', 'Europe/Amsterdam', 'Load list from somewhere'];
      $scope.locales = ['ENGLISH', 'Load list from somewhere'];
      $scope.updateFormats = updateFormats;

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.customFormat', updateFormats);
      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.timezone', processorUiChanged);
      $scope.$watch('processor.locale', processorUiChanged);
    }
  }
});
