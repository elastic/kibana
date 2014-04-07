define(function (require) {
  var notify = require('modules').get('notify');

  notify.directive('kbnNotifications', function () {
    return {
      restrict: 'E',
      scope: {
        list: '=list'
      },
      replace: true,
      template: require('text!./partials/toaster.html')
    };
  });
});