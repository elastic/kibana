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
import routes from 'ui/routes';
import { npSetup } from 'ui/new_platform';

// import the uiExports that we want to "use"
import 'uiExports/savedObjectTypes';
import 'uiExports/fieldFormatEditors';
import 'uiExports/navbarExtensions';
import 'uiExports/contextMenuActions';
import 'uiExports/managementSections';
import 'uiExports/indexManagement';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/shareContextMenuExtensions';
import 'uiExports/interpreter';

import 'ui/autoload/all';

import { localApplicationService } from './local_application_service';

npSetup.plugins.kibanaLegacy.registerLegacyAppAlias('doc', 'discover', { keepPrefix: true });
npSetup.plugins.kibanaLegacy.registerLegacyAppAlias('context', 'discover', { keepPrefix: true });

localApplicationService.attachToAngular(routes);

routes.enable();

const { config } = npSetup.plugins.kibanaLegacy;
routes.otherwise({
  redirectTo: `/${config.defaultAppId || 'discover'}`,
});
