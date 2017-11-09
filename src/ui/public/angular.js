require('ui/jquery');
require('../../../node_modules/angular/angular');
require('../../../node_modules/angular-translate');
require('../../../node_modules/angular-elastic/elastic');

const { uiModules } = require('ui/modules');

uiModules.get('kibana', ['monospaced.elastic', 'pascalprecht.translate']);

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
module.exports = window.angular;
