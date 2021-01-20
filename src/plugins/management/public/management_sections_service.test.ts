/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  ManagementSectionsService,
  getSectionsServiceStartPrivate,
} from './management_sections_service';

describe('ManagementService', () => {
  let managementService: ManagementSectionsService;

  beforeEach(() => {
    managementService = new ManagementSectionsService();
  });

  const capabilities = {
    navLinks: {},
    catalogue: {},
    management: {},
  };

  test('Provides default sections', () => {
    managementService.setup();
    managementService.start({ capabilities });
    const start = getSectionsServiceStartPrivate();

    expect(start.getSectionsEnabled().length).toEqual(6);
  });

  test('Register section, enable and disable', () => {
    // Setup phase:
    const setup = managementService.setup();
    const testSection = setup.register({ id: 'test-section', title: 'Test Section' });

    expect(testSection).not.toBeUndefined();

    // Start phase:
    managementService.start({ capabilities });
    const start = getSectionsServiceStartPrivate();

    expect(start.getSectionsEnabled().length).toEqual(7);

    testSection.disable();

    expect(start.getSectionsEnabled().length).toEqual(6);
  });

  test('Disables items that are not allowed by Capabilities', () => {
    // Setup phase:
    const setup = managementService.setup();
    const testSection = setup.register({ id: 'test-section', title: 'Test Section' });
    testSection.registerApp({ id: 'test-app-1', title: 'Test App 1', mount: jest.fn() });
    testSection.registerApp({ id: 'test-app-2', title: 'Test App 2', mount: jest.fn() });
    testSection.registerApp({ id: 'test-app-3', title: 'Test App 3', mount: jest.fn() });

    expect(testSection).not.toBeUndefined();

    // Start phase:
    managementService.start({
      capabilities: {
        navLinks: {},
        catalogue: {},
        management: {
          ['test-section']: {
            'test-app-1': true,
            'test-app-2': false,
            // test-app-3 intentionally left undefined. Should be enabled by default
          },
        },
      },
    });

    expect(testSection.apps).toHaveLength(3);
    expect(testSection.getAppsEnabled().map((app) => app.id)).toMatchInlineSnapshot(`
      Array [
        "test-app-1",
        "test-app-3",
      ]
    `);
  });
});
