const app = require('ui/modules').get('kibana');
const _ = require('lodash');

app.directive('kbnSettingsAddData', function () {
  return {
    restrict: 'E'
  };
});
