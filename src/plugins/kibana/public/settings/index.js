define(function (require, module, exports) {
  var _ = require('lodash');

  require('plugins/kibana/settings/styles/main.less');
  require('filters/start_from');

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  });

  require('modules').get('apps/settings')
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
        $scope.sections = require('plugins/kibana/settings/sections/index');
        $scope.section = _.find($scope.sections, { name: $scope.sectionName });

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });
      }
    };
  });
});
