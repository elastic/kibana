require('ui/jquery');
require('../../../node_modules/angular');
require('../../../node_modules/angular-translate');
require('../../../node_modules/angular-elastic/elastic');

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
module.exports = window.angular;

const { uiModules } = require('ui/modules');
uiModules.get('kibana', ['monospaced.elastic', 'pascalprecht.translate']);
