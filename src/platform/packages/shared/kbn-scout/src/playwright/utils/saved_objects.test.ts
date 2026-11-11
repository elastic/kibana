/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findImportedSavedObjectId } from './saved_objects';

describe('findImportedSavedObjectId', () => {
  const imported = [
    { id: 'lens-id', type: 'lens', title: 'Shared title' },
    { id: 'map-id', type: 'map', title: 'Shared title' },
  ];

  it('matches both type and title', () => {
    expect(findImportedSavedObjectId(imported, 'map', 'Shared title')).toBe('map-id');
  });

  it('fails with the missing object in the message', () => {
    expect(() => findImportedSavedObjectId(imported, 'search', 'Shared title')).toThrow(
      'Missing imported saved object: search "Shared title"'
    );
  });
});
