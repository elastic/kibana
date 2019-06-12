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

import pkg from '../../../../package.json';

export const createTestEntryTemplate = (defaultUiSettings) => (bundle) => `
/**
 * Test entry file
 *
 * This is programmatically created and updated, do not modify
 *
 * context: ${bundle.getContext()}
 *
 */

// import global polyfills before everything else
import '@babel/polyfill';
import 'custom-event-polyfill';
import 'whatwg-fetch';
import 'abortcontroller-polyfill';
import 'childnode-remove-polyfill';
import fetchMock from 'fetch-mock/es5/client';
import Symbol_observable from 'symbol-observable';

import { CoreSystem } from '__kibanaCore__';

// Fake uiCapabilities returned to Core in browser tests
const uiCapabilities = {
  navLinks: {
    myLink: true,
    notMyLink: true,
  },
  discover: {
    showWriteControls: true
  },
  visualize: {
    save: true
  },
  dashboard: {
    showWriteControls: true
  },
  timelion: {
    save: true
  },
};

// Mock fetch for CoreSystem calls.
fetchMock.config.fallbackToNetwork = true;
fetchMock.post(/\\/api\\/capabilities/, {
  status: 200,
  body: JSON.stringify({ capabilities: uiCapabilities }),
  headers: { 'Content-Type': 'application/json' },
});

// render the core system in a child of the body as the default children of the body
// in the browser tests are needed for mocha and other test components to work
const rootDomElement = document.createElement('div');
document.body.appendChild(rootDomElement)

const coreSystem = new CoreSystem({
  injectedMetadata: {
    version: '1.2.3',
    buildNumber: 1234,
    legacyMetadata: {
      nav: [],
      version: '1.2.3',
      buildNum: 1234,
      devMode: true,
      uiSettings: {
        defaults: ${JSON.stringify(defaultUiSettings, null, 2).split('\n').join('\n    ')},
        user: {}
      },
      nav: []
    },
    csp: {
      warnLegacyBrowsers: false,
    },
    capabilities: uiCapabilities,
    uiPlugins: [],
    vars: {
      kbnIndex: '.kibana',
      esShardTimeout: 1500,
      esApiVersion: ${JSON.stringify(pkg.branch)},
      esRequestTimeout: '300000',
      tilemapsConfig: {
        deprecated: {
          isOverridden: false,
          config: {
            options: {
            }
          }
        }
      },
      regionmapsConfig: {
        layers: []
      },
      mapConfig: {
        includeElasticMapsService: true,
        manifestServiceUrl: 'https://catalogue-staging.maps.elastic.co/v2/manifest'
      },
      vegaConfig: {
        enabled: true,
        enableExternalUrls: true
      },
      interpreterConfig: {
        enableInVisualize: true
      }
    },
  },
  rootDomElement,
  useLegacyTestHarness: true,
  requireLegacyFiles: () => {
    ${bundle.getRequires().join('\n  ')}
  }
})

coreSystem
  .setup()
  .then(() => {
    return coreSystem.start();
  });
`;
