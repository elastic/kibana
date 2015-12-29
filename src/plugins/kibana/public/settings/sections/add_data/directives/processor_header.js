const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('processorHeader', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '=',
      field: '=',
      collapsed: '=',
      description: '=',
      manager: '='
    },
    template: require('../views/processor_header.html'),
    controller: function ($scope) {}
  };
});
