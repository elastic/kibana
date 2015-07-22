define(function (require, module, exports) {
  var _ = require('lodash');

  require('plugins/kibana/settings/styles/main.less');
  require('ui/filters/start_from');

  require('ui/routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  });

  var sections = require('plugins/kibana/settings/sections/index');

  require('ui/modules')
  .get('apps/settings')
  .directive('kbnSettingsApp', function (Private, $route, timefilter) {
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/app.html'),
      transclude: true,
      scope: {
        sectionName: '@section'
      },
      link: function ($scope, $el) {
        timefilter.enabled = false;
        $scope.sections = sections;
        $scope.section = _.find($scope.sections, { name: $scope.sectionName });

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });
      }
    };
  });
});
