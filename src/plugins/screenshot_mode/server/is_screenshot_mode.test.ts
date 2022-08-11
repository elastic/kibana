/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { KBN_SCREENSHOT_MODE_HEADER } from '../common';
import { isScreenshotMode } from './is_screenshot_mode';

const { createKibanaRequest } = httpServerMock;

describe('isScreenshotMode', () => {
  test('screenshot headers are present', () => {
    expect(
      isScreenshotMode(createKibanaRequest({ headers: { [KBN_SCREENSHOT_MODE_HEADER]: 'true' } }))
    ).toBe(true);
  });

  test('screenshot headers are not present', () => {
    expect(isScreenshotMode(createKibanaRequest())).toBe(false);
  });
});
