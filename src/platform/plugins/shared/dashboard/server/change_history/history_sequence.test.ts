/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNextHistorySequence, INITIAL_HISTORY_SEQUENCE } from './history_sequence';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';

const getObject = (attributes: Partial<DashboardSavedObjectAttributes>, references = []) => ({
  attributes: { title: 'Dashboard', ...attributes } as DashboardSavedObjectAttributes,
  references,
});

describe('getNextHistorySequence', () => {
  it('starts legacy dashboards without a sequence at the initial value', () => {
    const existing = getObject({});
    expect(getNextHistorySequence(existing, getObject({ title: 'New title' }))).toBe(
      INITIAL_HISTORY_SEQUENCE
    );
  });

  it('keeps the sequence when the content is unchanged', () => {
    const existing = getObject({ historySequence: 4 });
    const next = getObject({ historySequence: 4 });
    expect(getNextHistorySequence(existing, next)).toBe(4);
  });

  it('ignores the stored sequence of the next attributes when comparing', () => {
    const existing = getObject({ historySequence: 4 });
    const next = getObject({ historySequence: undefined });
    expect(getNextHistorySequence(existing, next)).toBe(4);
  });

  it('increments the sequence when attributes change', () => {
    const existing = getObject({ historySequence: 4 });
    const next = getObject({ title: 'Changed' });
    expect(getNextHistorySequence(existing, next)).toBe(5);
  });

  it('increments the sequence when references change', () => {
    const existing = getObject({ historySequence: 2 });
    const next = {
      ...getObject({}),
      references: [{ id: '1', name: 'panel_0', type: 'lens' }],
    };
    expect(getNextHistorySequence(existing, next)).toBe(3);
  });
});
