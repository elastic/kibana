/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setupEnvironment } from './helpers';
import { AppTestBed, setupAppPage } from './sample.helpers';

jest.mock('../../public/application/models/legacy_core_editor/mode/worker/index.js', () => ({
  id: 'sense_editor/mode/worker',
  src: {},
}));

describe('Sample test', () => {
  let testBed: AppTestBed;
  let server: ReturnType<typeof setupEnvironment>['server'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterEach(() => {
    server.restore();
  });

  describe('when user is still preparing for upgrade', () => {
    beforeEach(async () => {
      testBed = await setupAppPage();
    });

    test('renders overview', () => {
      const { exists } = testBed;

      expect(exists('sampleTest')).toBe(true);
    });
  });
});
