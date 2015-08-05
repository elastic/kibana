require('plugins/appSwitcher/appSwitcher.less');

var kibanaLogoUrl = require('ui/images/kibana.png');

require('ui/chrome')
.setBrand({
  'logo': 'url(' + kibanaLogoUrl + ') left no-repeat',
  'smallLogo': 'url(' + kibanaLogoUrl + ') left no-repeat'
})
.setShowAppsLink(false)
.setTabs([
  {
    id: '',
    title: 'Apps',
    activeIndicatorColor: '#ecf0f1'
  }
])
.setRootTemplate(require('plugins/appSwitcher/appSwitcher.html'))
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
