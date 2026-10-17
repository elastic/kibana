/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasContentChanged } from './history_sequence';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';

const getObject = (attributes: Partial<DashboardSavedObjectAttributes>, references = []) => ({
  attributes: { title: 'Dashboard', ...attributes } as DashboardSavedObjectAttributes,
  references,
});

describe('hasContentChanged', () => {
  it('is false when the content is unchanged', () => {
    expect(hasContentChanged(getObject({}), getObject({}))).toBe(false);
  });

  it('is true when attributes change', () => {
    expect(hasContentChanged(getObject({}), getObject({ title: 'Changed' }))).toBe(true);
  });

  it('is true when references change', () => {
    const next = { ...getObject({}), references: [{ id: '1', name: 'panel_0', type: 'lens' }] };
    expect(hasContentChanged(getObject({}), next)).toBe(true);
  });
});
