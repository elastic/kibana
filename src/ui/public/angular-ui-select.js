require('jquery');
require('angular');
require('angular-sanitize');
require('ui-select/dist/select');
require('ui-select/dist/select.css');

const { uiModules } = require('ui/modules');

uiModules.get('kibana', ['ui.select', 'ngSanitize']);
