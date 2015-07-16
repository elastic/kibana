define(function (require) {
  require('plugins/kibana/discover/index');
  require('plugins/kibana/visualize/index');
  require('plugins/kibana/dashboard/index');
  require('plugins/kibana/settings/index');
  require('plugins/kibana/doc/index');

  require('routes')
  .otherwise({
    redirectTo: '/discover'
  });

  require('ui/chrome')
  .setLogo('url(/ui/images/kibana.png) left no-repeat', true)
  .setNavBackground('#222222')
  .setTabDefaults({
    resetWhenActive: true,
    trackLastPath: true,
    activeIndicatorColor: '#656a76'
  })
  .setTabs([
    {
      id: 'discover',
      title: 'Discover'
    },
    {
      id: 'visualize',
      title: 'Visualize',
      activeIndicatorColor: function () {
        return (String(this.lastPath).indexOf('/visualize/step/') === 0) ? 'white' : '#656a76';
      }
    },
    {
      id: 'dashboard',
      title: 'Dashboard'
    },
    {
      id: 'settings',
      title: 'Settings'
    }
  ])
  .setRootController('kibana', function ($scope, courier) {
    // wait for the application to finish loading
    $scope.$on('application.load', function () {
      courier.start();
    });
  });

});
