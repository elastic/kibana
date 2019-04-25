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

// autoloading

// preloading (for faster webpack builds)
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';

// import the uiExports that we want to "use"
import 'uiExports/home';
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/visEditorTypes';
import 'uiExports/visualize';
import 'uiExports/savedObjectTypes';
import 'uiExports/fieldFormats';
import 'uiExports/fieldFormatEditors';
import 'uiExports/navbarExtensions';
import 'uiExports/embeddableActions';
import 'uiExports/contextMenuActions';
import 'uiExports/managementSections';
import 'uiExports/indexManagement';
import 'uiExports/devTools';
import 'uiExports/docViews';
import 'uiExports/embeddableFactories';
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/autocompleteProviders';
import 'uiExports/shareContextMenuExtensions';

import 'ui/autoload/all';
import 'ui/kbn_top_nav';
import './home';
import './discover';
import './visualize';
import './dashboard';
import './management';
import './doc';
import './dev_tools';
import './context';
import 'ui/vislib';
import 'ui/agg_response';
import 'ui/agg_types';
import 'ui/timepicker';
import { showAppRedirectNotification } from 'ui/notify';
import 'leaflet';

routes.enable();


routes
  .otherwise({
    redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
  });

uiModules.get('kibana').run(showAppRedirectNotification);
