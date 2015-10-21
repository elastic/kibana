require('./senseHelpExample');

require('ui/modules')
.get('app/sense')
.directive('senseWelcome', function () {
  return {
    restrict: 'E',
    template: require('./welcome.html')
  }
});
