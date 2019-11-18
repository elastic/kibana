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

import {
  chromeServiceMock,
  notificationServiceMock,
  overlayServiceMock,
  uiSettingsServiceMock,
  i18nServiceMock,
  httpServiceMock,
  injectedMetadataServiceMock,
} from '../../../../core/public/mocks';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';

import { applicationServiceMock } from '../../../../core/public/application/application_service.mock';
import { createUiNewPlatformMock } from 'ui/new_platform/__mocks__/helpers';

// jest.mock('ui/new_platform');
// jest.doMock('ui/new_platform', () => ({
//   ...createUiNewPlatformMock()
// }));
jest.doMock('ui/new_platform', () => ({
  npSetup: {
    core: {
      notifications: notificationServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    },
  },
  npStart: {
    core: {
      i18n: i18nServiceMock.createStartContract(),
      chrome: chromeServiceMock.createStartContract(),
      http: httpServiceMock.createStartContract({ basePath: 'path' }),
      overlays: overlayServiceMock.createStartContract(),
      notifications: notificationServiceMock.createStartContract(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
      injectedMetadata: injectedMetadataServiceMock.createStartContract(),
      application: applicationServiceMock.createInternalStartContract(),
    },
    plugins: {
      data: {
        query: {
          timefilter: {
            history: {},
            timefilter: {},
          },
        },
      },
    },
  },
}));

Object.assign(window, {
  sessionStorage: new StubBrowserStorage(),
});
