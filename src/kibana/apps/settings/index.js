define(function (require, module, exports) {
  var _ = require('utils/mixins');

  var app = require('modules').get('app/settings');

  require('css!./styles/main.css');

  require('filters/start_from');

  var sections = require('./sections');

  // each controller will write it's section config to the sections module
  require('./controllers/advanced');
  require('./controllers/indices');

  require('routes')
  .when('/settings', {
    redirectTo: '/settings/indices'
  })
  .when('/settings/:section/:id?', {
    template: require('text!./index.html'),
    reloadOnSearch: false,
    resolve: {
      sectionLocals: function ($route, $location, $injector, Promise) {
        var section = _.find(sections, { name: $route.current.params.section });
        if (!section) return $location.url('/settings/');

        return Promise.props(_.mapValues(section.resolve || {}, function (fn) {
          return $injector.invoke(fn);
        }));
      }
    }
  });

  app.directive('settingsApp', function ($route, $location, $compile) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        $scope.sections = _.sortBy(sections, 'order');
        $scope.section = _.find($scope.sections, { name: $route.current.params.section });

        // reassign the sectionLocals to the locals object, so that the section's controller can use their own logic
        _.unwrapProp($route.current.locals, 'sectionLocals');

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