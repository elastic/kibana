/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
