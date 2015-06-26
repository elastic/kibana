define(function (require) {
  require('css!appSwitcher/appSwitcher.css');

  require('chrome')
  .setLogo('url(/images/kibana.png) left no-repeat', true)
  .setTabs([
    {
      id: '',
      title: 'Apps'
    }
  ])
  .setRootTemplate(require('text!appSwitcher/appSwitcher.html'))
  .setRootController('switcher', function SwitcherController($http) {
    var switcher = {
      loading: true
    };

    $http.get('/api/apps')
    .then(function (resp) {
      switcher.loading = false;
      switcher.apps = resp.data;
    });

    return switcher;
  });
});
