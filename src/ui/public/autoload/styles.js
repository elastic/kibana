// Kibana UI Framework
require('../../../ui_framework/components/index.scss');

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));
