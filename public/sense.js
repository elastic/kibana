require('ace');
require('ui/tooltip');
require('./css/sense.less');
require('./src/directives/senseHistory');
require('./src/directives/senseHistoryViewer');
require('./src/directives/senseSettings');
require('./src/directives/senseNavbar');

require('ui/chrome')
.setBrand({
  logo: 'url(/plugins/sense/icon.png) center no-repeat',
  smallLogo: 'url(/plugins/sense/icon.png) center no-repeat'
})
.setRootTemplate(require('./index.html'))
.setRootController('sense', function ($scope) {
  // require the root app code, which expects to execute once the dom is loaded up
  require('./src/app');
  const ConfigTemplate = require('ui/ConfigTemplate');
  const input = require('./src/input');
  const es = require('./src/es');
  const history = require('./src/history');

  this.dropdown = new ConfigTemplate({
    history: '<sense-history></sense-history>',
    settings: '<sense-settings></sense-settings>',
    help: require('./src/modals/help.html'),
  });

  this.sendSelected = () => {
    input.focus();
    input.sendCurrentRequestToES();
    return false;
  };

  this.autoIndent = (event) => {
    input.autoIndent();
    event.preventDefault();
    input.focus();
  };

  this.serverUrl = es.getBaseUrl();

  // read server url changes into scope
  es.addServerChangeListener((server) => {
    this.serverUrl = server;
  });

  // sync ui changes back to the es module
  $scope.$watch('sense.serverUrl', (serverUrl) => {
    es.setBaseUrl(serverUrl);
  });
});
