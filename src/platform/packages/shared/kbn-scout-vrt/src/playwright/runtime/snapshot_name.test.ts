/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createVisualSnapshotName } from './snapshot_name';

describe('createVisualSnapshotName', () => {
  it('creates deterministic names from step order and title', () => {
    expect(createVisualSnapshotName(3, 'Opens Advanced Settings')).toBe(
      '03_opens_advanced_settings.png'
    );
  });

  it('normalizes symbols and whitespace', () => {
    expect(createVisualSnapshotName(12, '  Read only badge / state  ')).toBe(
      '12_read_only_badge_state.png'
    );
  });
});
