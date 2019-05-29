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

// chrome expects to be loaded first, let it get its way
import chrome from '../chrome';

import { parse as parseUrl } from 'url';
import sinon from 'sinon';
import { Notifier } from '../notify';
import { metadata } from '../metadata';
import { UiSettingsClient } from '../../../../core/public';

import './test_harness.css';
import 'ng_mock';
import { setupTestSharding } from './test_sharding';

const { query } = parseUrl(window.location.href, true);
if (query && query.mocha) {
  try {
    window.mocha.setup(JSON.parse(query.mocha));
  } catch (error) {
    throw new Error(`'?mocha=${query.mocha}' query string param provided but it could not be parsed as json`);
  }
}

setupTestSharding();

before(() => {
  // prevent accidental ajax requests
  sinon.useFakeXMLHttpRequest();
});

let stubUiSettings;
function createStubUiSettings() {
  if (stubUiSettings) {
    stubUiSettings.stop();
  }

  stubUiSettings = new UiSettingsClient({
    api: {
      async batchSet() {
        return { settings: stubUiSettings.getAll() };
      }
    },
    onUpdateError: () => {},
    defaults: metadata.uiSettings.defaults,
    initialSettings: {},
  });
}

createStubUiSettings();
sinon.stub(chrome, 'getUiSettingsClient').callsFake(() => stubUiSettings);

beforeEach(function () {
  // ensure that notifications are not left in the notifiers
  if (Notifier.prototype._notifs.length) {
    const notifs = JSON.stringify(Notifier.prototype._notifs);
    Notifier.prototype._notifs.length = 0;
    throw new Error('notifications were left in the notifier: ' + notifs);
  }
});

afterEach(function () {
  createStubUiSettings();
});

// Kick off mocha, called at the end of test entry files
export function bootstrap(targetDomElement) {
  // allows test_harness.less to have higher priority selectors
  targetDomElement.setAttribute('id', 'test-harness-body');

  // load the hacks since we aren't actually bootstrapping the
  // chrome, which is where the hacks would normally be loaded
  require('uiExports/hacks');
  chrome.setupAngular();
}
