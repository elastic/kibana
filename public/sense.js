require('ace');

require('ui-bootstrap-custom');
require('ui/modules').get('kibana', ['sense.ui.bootstrap']);

require('ui/tooltip');
require('./css/sense.less');
require('./src/controllers/SenseController');
require('./src/directives/senseHistory');
require('./src/directives/senseSettings');
require('./src/directives/senseHelp');
require('./src/directives/senseWelcome');
require('./src/directives/senseNavbar');

require('ui/chrome')
.setBrand({
  logo: 'url(/plugins/sense/icon.png) center no-repeat',
  smallLogo: 'url(/plugins/sense/icon.png) center no-repeat'
})
.setRootTemplate(require('./index.html'))
.setRootController('sense', 'SenseController');
