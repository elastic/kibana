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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { coreMock } from '../../../core/public/mocks';

import { ManagementApp } from './management_app';
// @ts-ignore
import { LegacyManagementSection } from './legacy';

function createTestApp() {
  const legacySection = new LegacyManagementSection('legacy');
  return new ManagementApp(
    {
      id: 'test-app',
      title: 'Test App',
      basePath: '',
      mount(params) {
        params.setBreadcrumbs([{ text: 'Test App' }]);
        ReactDOM.render(<div>Test App - Hello world!</div>, params.element);

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    },
    [],
    jest.fn(),
    () => legacySection,
    coreMock.createSetup().getStartServices
  );
}

test('Management app can mount and unmount', async () => {
  const testApp = createTestApp();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const unmount = testApp.mount({ element: container, basePath: '', setBreadcrumbs: jest.fn() });
  expect(container).toMatchSnapshot();
  (await unmount)();
  expect(container).toMatchSnapshot();
});

test('Enabled by default, can disable', () => {
  const testApp = createTestApp();
  expect(testApp.enabled).toBe(true);
  testApp.disable();
  expect(testApp.enabled).toBe(false);
});
