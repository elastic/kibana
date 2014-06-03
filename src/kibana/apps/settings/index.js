define(function (require, module, exports) {
  var _ = require('utils/mixins');

  require('css!./styles/main.css');
  require('filters/start_from');
  require('./directives/advanced');
  require('./directives/objects');
  require('./directives/indices/indices');
  require('./directives/indices/create');
  require('./directives/indices/edit');

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  });

  require('modules').get('app/settings')
  .directive('kbnSettingsApp', function ($route, timefilter) {
    return {
      restrict: 'E',
      template: require('text!./partials/app.html'),
      transclude: true,
      scope: {
        sectionName: '@section'
      },
      link: function ($scope, $el) {

        timefilter.enabled(false);

        var sections = require('./_sections');

        $scope.sections = _.sortBy(sections, 'order');
        $scope.section = _.find($scope.sections, { name: $scope.sectionName });

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });
      }
    };
  });
});
