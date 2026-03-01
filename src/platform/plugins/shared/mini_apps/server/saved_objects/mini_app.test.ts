/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { miniAppSavedObjectType } from './mini_app';
import { MINI_APP_SAVED_OBJECT_TYPE } from '../../common';

describe('miniAppSavedObjectType', () => {
  it('should have the correct name', () => {
    expect(miniAppSavedObjectType.name).toBe(MINI_APP_SAVED_OBJECT_TYPE);
  });

  it('should have the correct mappings', () => {
    expect(miniAppSavedObjectType.mappings).toEqual({
      dynamic: false,
      properties: {
        name: { type: 'text' },
        script_code: { type: 'text', index: false },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
      },
    });
  });

  it('should be importable and exportable', () => {
    expect(miniAppSavedObjectType.management?.importableAndExportable).toBe(true);
  });

  it('should use name as the title', () => {
    const mockObject = {
      id: 'test-id',
      type: MINI_APP_SAVED_OBJECT_TYPE,
      attributes: {
        name: 'Test Mini App',
        script_code: 'console.log("test")',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      references: [],
    };

    expect(miniAppSavedObjectType.management?.getTitle?.(mockObject)).toBe('Test Mini App');
  });
});
