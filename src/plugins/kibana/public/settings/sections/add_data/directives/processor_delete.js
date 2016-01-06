const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'delete',
  title: 'Delete',
  template: '<processor-delete></processor-delete>'
});

//scope.processor is attached by the wrapper.
app.directive('processorDelete', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_delete.html'),
    controller : function ($scope, $rootScope, $timeout, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorDelete', true);

      function getDescription() {
        let fieldList = getSelectedFields()
          .map(field => `[${field}]`).join(', ');

        return `Delete Fields ${fieldList}`;
      }

      function refreshFields() {
        const newKeys = keysDeep(processor.inputObject);

        const oldKeys = $scope.fields.map((field) => field.name);
        const removed = _.difference(oldKeys, newKeys);
        const added = _.difference(newKeys, oldKeys);

        added.forEach((fieldname) => {
          $scope.fields.push({ name: fieldname, selected: false });
        });
        removed.forEach((fieldname) => {
          _.remove($scope.fields, (field) => {
            return field.name === fieldname;
          });
        });
        $scope.fields.sort();
      }

      function getSelectedFields() {
        let result = [];
        $scope.fields.forEach((field) => {
          if (field.selected) {
            result.push(field.name);
          }
        });

        return result;
      }

      function checkForNewInputObject() {
        logger.log('consuming new inputObject');
        refreshFields();
      }

      function getSelectedFields() {
        let result = [];
        $scope.fields.forEach((field) => {
          if (field.selected) {
            result.push(field.name);
          }
        });

        return result;
      }

      function applyProcessor() {
        checkForNewInputObject();

        logger.log('I am processing!');
        $rootScope.$broadcast('processor_started', { processor: processor });

        //this is just here to simulate an async process.
        $timeout(function() {
          const output = _.cloneDeep(processor.inputObject);
          const description = getDescription();

          processor.fieldsToDelete = getSelectedFields();
          processor.fieldsToDelete.forEach((field) => {
            delete output[field];
          });

          const message = {
            processor: processor,
            output: output,
            description: description
          };

        logger.log('I am DONE processing!');
          $rootScope.$broadcast('processor_finished', message);
        }, 0);
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.fields = [];

      $scope.toggleField = function(field) {
        applyProcessor();
      }

      $scope.$on('$destroy', () => {
        startListener();
      });
    }
  }
});

