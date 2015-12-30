const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('processContainerHeader', function () {
  return {
    restrict: 'E',
    scope: {
      processor: '=',
      field: '=',
      collapsed: '=',
      description: '=',
      manager: '='
    },
    template: require('../views/process_container_header.html'),
    controller: function ($scope) {}
  };
});
