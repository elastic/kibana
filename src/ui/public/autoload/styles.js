// Kibana UI Framework
require('../../../../ui_framework/dist/ui_framework.css');

// Elastic UI Framework
require('@elastic/eui/dist/eui_theme_light.css');

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));
