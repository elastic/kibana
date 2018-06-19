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

import pkg from '../../../package.json';

export const createTestEntryTemplate = (defaultUiSettings) => (bundle) => `
/**
 * Test entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: ${bundle.getContext()}
 *
 */

window.__KBN__ = {
  version: '1.2.3',
  buildNum: 1234,
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
      manifestServiceUrl: 'https://staging-dot-catalogue-dot-elastic-layer.appspot.com/v1/manifest'
    },
    vegaConfig: {
      enabled: true,
      enableExternalUrls: true
    },
  },
  uiSettings: {
    defaults: ${JSON.stringify(defaultUiSettings, null, 2).split('\n').join('\n    ')},
    user: {}
  }
};

require('ui/test_harness');
${bundle.getRequires().join('\n')}
require('ui/test_harness').bootstrap(/* go! */);
`;
