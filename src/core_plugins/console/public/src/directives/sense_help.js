require('./sense_help_example');

require('ui/modules')
.get('app/sense')
.directive('senseHelp', function () {
  return {
    restrict: 'E',
    template: require('./help.html')
  }
});
