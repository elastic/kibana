/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DiscoverBulkAction } from '../types';
import { toCustomBulkActions } from './to_custom_bulk_actions';

const rows = ['a', 'b', 'c'].map((id) => ({ id, raw: {}, flattened: {} } as DataTableRecord));

describe('toCustomBulkActions', () => {
  it('passes the selected records in selection order to onClick', () => {
    const onClick = jest.fn();
    const [action] = toCustomBulkActions([{ key: 'k', label: 'Label', onClick }], rows);

    action.onClick({ selectedDocIds: ['c', 'a'] });

    expect(onClick).toHaveBeenCalledWith({ selectedDocs: [rows[2], rows[0]] });
  });

  it('drops selected ids that no longer match a row', () => {
    const onClick = jest.fn();
    const [action] = toCustomBulkActions([{ key: 'k', label: 'Label', onClick }], rows);

    action.onClick({ selectedDocIds: ['a', 'gone'] });

    expect(onClick).toHaveBeenCalledWith({ selectedDocs: [rows[0]] });
  });

  it('adapts isAvailable and getDisabledReason to receive records', () => {
    const isAvailable = jest.fn(() => false);
    const getDisabledReason = jest.fn(() => 'Too many');
    const [action] = toCustomBulkActions(
      [{ key: 'k', label: 'Label', onClick: jest.fn(), isAvailable, getDisabledReason }],
      rows
    );

    expect(action.isAvailable?.({ selectedDocIds: ['b'] })).toBe(false);
    expect(action.getDisabledReason?.({ selectedDocIds: ['b'] })).toBe('Too many');
    expect(isAvailable).toHaveBeenCalledWith({ selectedDocs: [rows[1]] });
    expect(getDisabledReason).toHaveBeenCalledWith({ selectedDocs: [rows[1]] });
  });

  it('omits optional handlers that were not provided and keeps other fields', () => {
    const bulkAction: DiscoverBulkAction = {
      key: 'k',
      label: 'Label',
      'data-test-subj': 'bulk',
      onClick: jest.fn(),
    };
    const [action] = toCustomBulkActions([bulkAction], rows);

    expect(action.isAvailable).toBeUndefined();
    expect(action.getDisabledReason).toBeUndefined();
    expect(action).toMatchObject({ key: 'k', label: 'Label', 'data-test-subj': 'bulk' });
  });
});
