/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformFlappingSettingsResponse } from './transform_flapping_settings_response';

describe('transformFlappingSettingsResponse', () => {
  test('should transform flapping settings response', () => {
    const now = new Date().toISOString();

    const result = transformFlappingSettingsResponse({
      created_by: 'test',
      updated_by: 'test',
      created_at: now,
      updated_at: now,
      enabled: true,
      look_back_window: 20,
      status_change_threshold: 20,
    });

    expect(result).toEqual({
      createdBy: 'test',
      updatedBy: 'test',
      createdAt: now,
      updatedAt: now,
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    });
  });
});
