const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'date',
  title: 'Date',
  template: '<processor-ui-date></processor-ui-date>',
  getDefinition: function() {
    const self = this;
    return {
      'date' : {
        'processor_id': self.processorId,
        'match_field' : self.sourceField ? self.sourceField : '',
        'target_field' : self.targetField ? self.targetField : '',
        'match_formats' : self.formats,
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

//scope.processor is attached by the process_container.
app.directive('processorUiDate', function() {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_date.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      function consumeNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        $rootScope.$broadcast('processor_ui_changed', { processor: processor });
      }

      function selectableArray(array) {
        return array.map((item) => {
          return {
            title: item,
            selected: false
          };
        });
      }

      function updateFormats() {
        const formats = [];
        $scope.customFormatSelected = false;
        $scope.formats.forEach((format) => {
          if (format.selected) {
            if (format.title === 'Custom') {
              $scope.customFormatSelected = true;
              formats.push($scope.customFormat);
            } else {
              formats.push(format.title);
            }
          }
        });

        processor.formats = formats;
        processorUiChanged();
      }
      updateFormats = debounce(updateFormats, 200);

      $scope.formats = selectableArray(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom']);
      $scope.timezones = ['UTC', 'Europe/Amsterdam', 'Load list from somewhere'];
      $scope.locales = ['ENGLISH', 'Load list from somewhere'];
      processor.sourceField = '';
      processor.timezone = 'UTC';
      processor.locale = 'ENGLISH';
      processor.targetField = "@timestamp";
      $scope.customFormatSelected = false;
      $scope.updateFormats = updateFormats;

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('customFormat', updateFormats);
      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.timezone', processorUiChanged);
      $scope.$watch('processor.locale', processorUiChanged);
    }
  }
});
