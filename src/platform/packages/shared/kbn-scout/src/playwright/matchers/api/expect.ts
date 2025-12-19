/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import { toMatchJSON } from './to_match_json';
import { toHaveHeaders } from './to_have_headers';

/**
 * Custom Playwright matchers for API response assertions.
 * These matchers are designed to work with Scout's ApiClientResponse type.
 */
export const expectApi = baseExpect.extend({
  toHaveStatusCode,
  toHaveStatusText,
  toMatchJSON,
  toHaveHeaders,
});
