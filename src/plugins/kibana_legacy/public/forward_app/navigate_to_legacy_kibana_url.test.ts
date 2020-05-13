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

import { ForwardDefinition } from '../index';
import { navigateToLegacyKibanaUrl } from './navigate_to_legacy_kibana_url';
import { CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';

describe('migrate legacy kibana urls', () => {
  let forwardDefinitions: ForwardDefinition[];
  let coreStart: CoreStart;
  let locationMock: Location;

  beforeEach(() => {
    coreStart = coreMock.createStart({ basePath: '/base/path' });
    forwardDefinitions = [
      {
        legacyAppId: 'myApp',
        newAppId: 'updatedApp',
        rewritePath: jest.fn(() => '/new/path'),
      },
    ];
    locationMock = { href: '' } as Location;
  });

  it('should redirect to kibana if no forward definition is found', () => {
    navigateToLegacyKibanaUrl(
      '/myOtherApp/deep/path',
      forwardDefinitions,
      coreStart.http.basePath,
      coreStart.application,
      locationMock
    );

    expect(locationMock.href).toEqual('/base/path/app/kibana#/myOtherApp/deep/path');
  });

  it('should call navigateToApp with migrated URL', () => {
    navigateToLegacyKibanaUrl(
      '/myApp/deep/path',
      forwardDefinitions,
      coreStart.http.basePath,
      coreStart.application,
      locationMock
    );

    expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('updatedApp', {
      path: '/new/path',
    });
    expect(forwardDefinitions[0].rewritePath).toHaveBeenCalledWith('/myApp/deep/path');
    expect(locationMock.href).toEqual('');
  });
});
