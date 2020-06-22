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

import { ManagementSection, RegisterManagementSectionArgs } from './management_section';

describe('ManagementSection', () => {
  const createSection = (
    config: RegisterManagementSectionArgs = {
      id: 'test-section',
      title: 'Test Section',
    } as RegisterManagementSectionArgs
  ) => new ManagementSection(config);

  test('cannot register two apps with the same id', () => {
    const section = createSection();
    const testAppConfig = { id: 'test-app', title: 'Test App', mount: () => () => {} };

    section.registerApp(testAppConfig);

    expect(section.apps.length).toEqual(1);

    expect(() => {
      section.registerApp(testAppConfig);
    }).toThrow();
  });

  test('can enable and disable apps', () => {
    const section = createSection();
    const testAppConfig = { id: 'test-app', title: 'Test App', mount: () => () => {} };

    const app = section.registerApp(testAppConfig);

    expect(section.getAppsEnabled().length).toEqual(1);

    app.disable();

    expect(section.getAppsEnabled().length).toEqual(0);
  });
});
