define(function (require, module, exports) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('css!./styles/main.css');

  require('filters/start_from');
  require('./services/index_patterns');
  require('./controllers/advanced');
  require('./controllers/indices');

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  })
  .when('/settings/:section/:id?', {
    template: require('text!./index.html'),
    reloadOnSearch: false
  });

  var sections = [
    {
      name: 'indices',
      display: 'Indices',
      url: '#/settings/indices',
      template: require('text!./partials/indices.html')
    },
    {
      name: 'advanced',
      display: 'Advanced',
      url: '#/settings/advanced',
      template: require('text!./partials/advanced.html')
    }
  ];

  app.directive('settingsApp', function ($route, $location, $compile) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        $scope.sections = sections;
        $scope.section = _.find($scope.sections, { name: $route.current.params.section });
        if (!$scope.section) return $location.url('/settings');

        $scope.sections.forEach(function (section) {
          section.class = (section === $scope.section) ? 'active' : void 0;
        });

        var $canvas = $el.find('.settings-section-container');
        var $sectionScope = $scope.$new();
        $canvas.html($compile($scope.section.template)($sectionScope));
      }
    };
  });

});