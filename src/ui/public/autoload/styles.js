const theme = require('../theme');

// Kibana UI Framework
require('@kbn/ui-framework/dist/ui_framework.css');

// Elastic UI Framework, light theme
const euiThemeLight = require('!!raw-loader!@elastic/eui/dist/eui_theme_k6_light.css');
theme.registerTheme('light', euiThemeLight);

// Elastic UI Framework, dark theme
const euiThemeDark = require('!!raw-loader!@elastic/eui/dist/eui_theme_k6_dark.css');
theme.registerTheme('dark', euiThemeDark);

// Set default theme.
theme.applyTheme('light');

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));
