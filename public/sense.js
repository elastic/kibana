require('ace');
require('./css/sense.less');

require('ui/chrome')
.setBrand({
  logo: 'url(/plugins/sense/favicon.ico) center no-repeat',
  smallLogo: 'url(/plugins/sense/favicon.ico) center no-repeat'
})
.setTabs([{
  id: '',
  title: 'Sense'
}])
.setRootTemplate(require('./index.html'))
.setRootController('sense', function () {
  // require the root app code, which expects to execute once the dom is loaded up
  require('./src/app');
  const ConfigTemplate = require('ui/ConfigTemplate');

  this.dropdown = new ConfigTemplate({
    history: require('./src/modals/history.html'),
    settings: require('./src/modals/settings.html'),
    help: require('./src/modals/help.html'),
  });
});
