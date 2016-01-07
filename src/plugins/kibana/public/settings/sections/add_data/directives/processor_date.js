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
    return `Date - [${source}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorDate', function() {
  return {
    restrict: 'E',
    template: require('../views/processor_date.html'),
    controller: function($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;

      function getDescription() {
        const source = (processor.sourceField) ? processor.sourceField : '?';
        return `Date - [${source}]`;
      }

      function checkForNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function applyProcessor() {
        checkForNewInputObject();

        $rootScope.$broadcast('processor_started', {
          processor: processor
        });

        let output;
        const description = processor.getDescription();

        ingest.simulate(processor)
        .then(function(result) {
          //TODO: this flow needs to be streamlined
          if (!result) {
            output = _.cloneDeep(processor.inputObject);
          } else {
            output = result;
          }

          const message = {
            processor: processor,
            output: output,
            description: description
          };

          $rootScope.$broadcast('processor_finished', message);
        });
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      function selectableArray(array) {
        return array.map((item) => {
          return {
            title: item,
            selected: false
          };
        });
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.formats = selectableArray(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom']);
      $scope.timezones = ['UTC', 'Europe/Amsterdam', 'Load list from somewhere'];
      $scope.locales = ['ENGLISH', 'Load list from somewhere'];
      processor.timezone = 'UTC';
      processor.locale = 'ENGLISH';
      processor.targetField = "@timestamp";
      $scope.customFormatSelected = false;

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
      $scope.updateFormats = updateFormats;

      $scope.$on('$destroy', () => {
        startListener();
      });

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
