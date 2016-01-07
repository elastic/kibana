const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('outputPreview', function () {
  return {
    restrict: 'E',
    template: require('../views/output_preview.html'),
    scope: {
      oldObject: '=',
      newObject: '='
    },
    controller: function ($scope) {
    }
  };
});
