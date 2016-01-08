const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'date',
  title: 'Date',
  template: '<processor-date></processor-date>',
  getDefinition: function() {
    const self = this;
    return {
      'date' : {
        'match_field' : self.sourceField,
        'target_field' : self.targetField,
        'match_formats' : self.formats,
        'timezone': self.timezone,
        'locale': self.locale
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
app.directive('processorDate', function() {
  return {
    restrict: 'E',
    template: require('../views/processor_date.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, processor.title, false);

      function consumeNewInputObject(event, message) {
        if (message.processor !== processor) return;

        logger.log('consuming new inputObject', processor.inputObject);

        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();

        $rootScope.$broadcast('processor_input_object_changed', { processor: processor });
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function applyProcessor() {
        logger.log('processor properties changed. force update');
        $rootScope.$broadcast('processor_force_update', { processor: processor });
      }

      const inputObjectChangingListener = $scope.$on('processor_input_object_changing', consumeNewInputObject);

      $scope.$on('$destroy', () => {
        inputObjectChangingListener();
      });
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
        applyProcessor();
      }
      updateFormats = debounce(updateFormats, 200);

      $scope.formats = selectableArray(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom']);
      $scope.timezones = ['UTC', 'Europe/Amsterdam', 'Load list from somewhere'];
      $scope.locales = ['ENGLISH', 'Load list from somewhere'];
      processor.timezone = 'UTC';
      processor.locale = 'ENGLISH';
      processor.targetField = "@timestamp";
      $scope.customFormatSelected = false;
      $scope.updateFormats = updateFormats;

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('customFormat', updateFormats);
      $scope.$watch('processor.targetField', applyProcessor);
      $scope.$watch('processor.timezone', applyProcessor);
      $scope.$watch('processor.locale', applyProcessor);
    }
  }
});
