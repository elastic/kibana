/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/core/packages/fatal-errors/browser-internal/src/fatal_errors_service.test.mocks.ts
export const mockRender = jest.fn();
jest.mock('react-dom', () => {
  return {
    render: mockRender,
  };
========
import { createPlaywrightConfig } from '../..';

export default createPlaywrightConfig({
  testDir: './tests',
>>>>>>>> 0390bf59a8b ([scout] update failed test reporter to support package (#235612)):src/platform/packages/shared/kbn-scout/test/scout/playwright.config.ts
});
