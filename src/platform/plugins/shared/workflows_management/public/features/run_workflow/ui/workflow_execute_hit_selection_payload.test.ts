/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  buildAlertTriggerInputFromRecords,
  buildDocumentTriggerInputFromRecords,
} from './workflow_execute_hit_selection_payload';

const alertRecord: DataTableRecord = {
  id: '.alerts-default::1::',
  raw: {
    _id: '1',
    _index: '.alerts-default',
    _source: {
      '@timestamp': '2024-01-01T00:00:00Z',
      'kibana.alert.rule.name': 'Test Rule',
    },
  },
  flattened: {},
};

describe('workflow_execute_hit_selection_payload', () => {
  it('buildAlertTriggerInputFromRecords returns null when empty', () => {
    expect(buildAlertTriggerInputFromRecords([])).toBeNull();
  });

  it('buildAlertTriggerInputFromRecords maps selected alert ids', () => {
    const result = buildAlertTriggerInputFromRecords([alertRecord]);
    expect(result).toEqual({
      event: {
        alertIds: [{ _id: '1', _index: '.alerts-default' }],
        triggerType: 'alert',
      },
    });
  });

  it('buildDocumentTriggerInputFromRecords maps selected documents', () => {
    const result = buildDocumentTriggerInputFromRecords(
      [
        {
          id: 'logs-*::doc-1::',
          raw: {
            _id: 'doc-1',
            _index: 'logs-*',
            _source: { '@timestamp': '2024-01-02T00:00:00Z', message: 'hello' },
          },
          flattened: {},
        },
      ],
      { submittedQuery: 'message: hello', dataViewTitle: 'logs-*' }
    );

    expect(result).toEqual({
      event: {
        documents: [
          {
            id: 'doc-1',
            index: 'logs-*',
            timestamp: '2024-01-02T00:00:00Z',
            data: { '@timestamp': '2024-01-02T00:00:00Z', message: 'hello' },
          },
        ],
        query: 'message: hello',
        dataView: 'logs-*',
      },
    });
  });
});
