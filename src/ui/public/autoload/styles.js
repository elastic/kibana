const theme = require('../theme');

// Kibana UI Framework
require('../../../../ui_framework/dist/ui_framework.css');

// Elastic UI Framework, light theme
const euiThemeLight = require('!!style-loader/useable!css-loader!@elastic/eui/dist/eui_theme_light.css');
theme.registerTheme('light', [euiThemeLight]);

// Elastic UI Framework, dark theme
const euiThemeDark = require('!!style-loader/useable!css-loader!@elastic/eui/dist/eui_theme_dark.css');
theme.registerTheme('dark', [euiThemeDark]);

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));
