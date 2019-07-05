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

import _ from 'lodash';
import angular from 'angular';

import { metadata } from '../metadata';
import '../state_management/global_state';
import '../config';
import '../notify';
import '../private';
import '../promises';
import '../storage';
import '../directives/kbn_src';
import '../watch_multi';
import './services';
import '../react_components';

import { initAngularApi } from './api/angular';
import appsApi from './api/apps';
import { initChromeControlsApi } from './api/controls';
import { initChromeNavApi } from './api/nav';
import { initBreadcrumbsApi } from './api/breadcrumbs';
import templateApi from './api/template';
import { initChromeThemeApi } from './api/theme';
import { initChromeXsrfApi } from './api/xsrf';
import { initUiSettingsApi } from './api/ui_settings';
import { initLoadingCountApi } from './api/loading_count';
import { initSavedObjectClient } from './api/saved_object_client';
import { initChromeBasePathApi } from './api/base_path';
import { initChromeInjectedVarsApi } from './api/injected_vars';

export const chrome = {};
const internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    devMode: true,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

initUiSettingsApi(chrome);
initSavedObjectClient(chrome);
appsApi(chrome, internals);
initChromeXsrfApi(chrome, internals);
initChromeBasePathApi(chrome);
initChromeInjectedVarsApi(chrome);
initChromeNavApi(chrome, internals);
initBreadcrumbsApi(chrome, internals);
initLoadingCountApi(chrome, internals);
initAngularApi(chrome, internals);
initChromeControlsApi(chrome);
templateApi(chrome, internals);
initChromeThemeApi(chrome);

const waitForBootstrap = new Promise(resolve => {
  chrome.bootstrap = function (targetDomElement) {
    // import chrome nav controls and hacks now so that they are executed after
    // everything else, can safely import the chrome, and interact with services
    // and such setup by all other modules
    require('uiExports/chromeNavControls');
    require('uiExports/hacks');

    // sets attribute on body for stylesheet sandboxing
    document.body.setAttribute('id', `${internals.app.id}-app`);

    chrome.setupAngular();
    targetDomElement.setAttribute('id', 'kibana-body');
    targetDomElement.setAttribute('kbn-chrome', 'true');
    angular.bootstrap(targetDomElement, ['kibana']);
    resolve(targetDomElement);
  };
});

/**
 * ---- ATTENTION: Read documentation carefully before using this! ----
 *
 * Returns a promise, that resolves with an instance of the currently used Angular
 * $injector service for usage outside of Angular.
 * You can use this injector to get access to any other injectable component (service,
 * constant, etc.) by using its get method.
 *
 * If you ever use Angular outside of an Angular context via this method, you should
 * be really sure you know what you are doing!
 *
 * When using this method inside your code, you will need to stub it while running
 * tests. Look into 'src/test_utils/public/stub_get_active_injector' for more information.
 */
chrome.dangerouslyGetActiveInjector = () => {
  return waitForBootstrap.then((targetDomElement) => {
    const $injector = angular.element(targetDomElement).injector();
    if (!$injector) {
      return Promise.reject('targetDomElement had no angular context after bootstrapping');
    }
    return $injector;
  });
};
