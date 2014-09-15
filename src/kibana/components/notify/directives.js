define(function (require) {
  var notify = require('modules').get('kibana/notify');
  var _ = require('lodash');

  notify.directive('kbnNotifications', function () {
    return {
      restrict: 'E',
      scope: {
        list: '=list'
      },
      replace: true,
      template: require('text!components/notify/partials/toaster.html')
    };
  });
});
