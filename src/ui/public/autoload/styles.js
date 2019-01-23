/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const theme = require('../theme');

// Kibana UI Framework
require('@kbn/ui-framework/dist/kui_light.css');

// Elastic UI Framework, light theme
const euiThemeLight = require('!!raw-loader!@elastic/eui/dist/eui_theme_light.css');
theme.registerTheme('light', euiThemeLight);

// Elastic UI Framework, dark theme
const euiThemeDark = require('!!raw-loader!@elastic/eui/dist/eui_theme_dark.css');
theme.registerTheme('dark', euiThemeDark);

// Set default theme.
theme.applyTheme('light');

// All Kibana styles inside of the /styles dir
const context = require.context('../styles', false, /[\/\\](?!mixins|variables|_|\.)[^\/\\]+\.less/);
context.keys().forEach(key => context(key));

// manually require non-less files
require('../styles/disable_animations');
