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

import { uiSettingsServiceMock } from '../../../../../core/public/mocks';

const uiSettingsClient = {
  ...uiSettingsServiceMock.createSetupContract(),
  getUpdate$: () => ({
    subscribe: jest.fn(),
  }),
};

const chrome = {
  addBasePath: (path) => (path ? path : 'test/base/path'),
  breadcrumbs: {
    set: () => ({}),
  },
  getBasePath: () => '/test/base/path',
  getInjected: jest.fn(),
  getUiSettingsClient: () => uiSettingsClient,
  getSavedObjectsClient: () => '',
  getXsrfToken: () => 'kbn-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default chrome;

// Copied from `src/legacy/ui/public/chrome/chrome.js`
import _ from 'lodash';
import angular from 'angular';
import { metadata } from '../../metadata';

const internals = _.defaults(_.cloneDeep(metadata), {
  basePath: '',
  rootController: null,
  rootTemplate: null,
  showAppsLink: null,
  xsrfToken: null,
  devMode: true,
  brand: null,
  nav: [],
  applicationClasses: [],
});

const waitForBootstrap = new Promise((resolve) => {
  chrome.bootstrap = function (targetDomElement) {
    // import chrome nav controls and hacks now so that they are executed after
    // everything else, can safely import the chrome, and interact with services
    // and such setup by all other modules
    require('uiExports/chromeNavControls');
    require('uiExports/hacks');

    // sets attribute on body for stylesheet sandboxing
    document.body.setAttribute('id', `${internals.app.id}-app`);

    chrome.setupAngular();
    targetDomElement.setAttribute('kbn-chrome', 'true');
    targetDomElement.setAttribute('ng-class', "{ 'hidden-chrome': !chrome.getVisible() }");
    targetDomElement.className = 'app-wrapper';
    angular.bootstrap(targetDomElement, ['kibana']);
    resolve(targetDomElement);
  };
});

chrome.dangerouslyGetActiveInjector = () => {
  return waitForBootstrap.then((targetDomElement) => {
    const $injector = angular.element(targetDomElement).injector();
    if (!$injector) {
      return Promise.reject('targetDomElement had no angular context after bootstrapping');
    }
    return $injector;
  });
};
