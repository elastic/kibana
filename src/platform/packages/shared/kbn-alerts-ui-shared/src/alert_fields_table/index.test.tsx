/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AlertFieldsTableProps } from '.';
import { AlertFieldsTable } from '.';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('AlertFieldsTable', () => {
  const defaultProps = {
    alert: {
      'kibana.alert.status': ['active'],
      'kibana.alert.url': ['ALERT_URL'],
      'kibana.alert.evaluation.conditions': [
        'Number of matching documents is NOT greater than 1000',
      ],
      'kibana.alert.rule.producer': ['stackAlerts'],
      'kibana.alert.reason.text': [
        'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
      ],
      'kibana.alert.rule.rule_type_id': ['.es-query'],
      'kibana.alert.evaluation.value': ['0'],
      'kibana.alert.instance.id': ['query matched'],
      'kibana.alert.flapping': [true],
      'kibana.alert.rule.name': ['Test rule'],
      'event.kind': ['signal'],
      'kibana.alert.title': ["rule 'Test rule' recovered"],
      'kibana.alert.workflow_status': ['open'],
      'kibana.alert.rule.uuid': ['313b0cfb-3455-41da-aff9-cee2bc9637f1'],
      'kibana.alert.time_range': [
        {
          gte: '1703241047013',
        },
      ],
      'kibana.alert.flapping_history': [false],
      'kibana.alert.reason': [
        'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
      ],
      'kibana.alert.rule.consumer': ['infrastructure'],
      'kibana.alert.action_group': ['query matched'],
      'kibana.alert.rule.category': ['Elasticsearch query'],
      'kibana.alert.start': ['2023-12-22T10:30:47.013Z'],
      'event.action': ['active'],
      '@timestamp': ['2023-12-22T10:32:53.036Z'],
      'kibana.alert.duration.us': [126023000],
      'kibana.alert.rule.execution.uuid': ['ffcc5773-a4cc-48be-a265-9b16f85f4e62'],
      'kibana.alert.uuid': ['93377bf3-d837-425d-b63f-97a8a5ae8054'],
      'kibana.space_ids': ['default'],
      'kibana.version': ['8.13.0'],
      'kibana.alert.evaluation.threshold': [1000],
      'kibana.alert.rule.parameters': [
        {
          searchConfiguration: {
            query: {
              language: 'kuery',
              query: '',
            },
            index: '8e29356e-9d83-4a89-a79d-7d096104f3f6',
          },
          timeField: '@timestamp',
          searchType: 'searchSource',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          threshold: [1000],
          thresholdComparator: '>',
          size: 100,
          aggType: 'count',
          groupBy: 'all',
          termSize: 5,
          excludeHitsFromPreviousRun: true,
        },
      ],
      'kibana.alert.rule.revision': [0],
      _id: '93377bf3-d837-425d-b63f-97a8a5ae8054',
      _index: '.internal.alerts-stack.alerts-default-000001',
    },
  } as unknown as AlertFieldsTableProps;
  const getBodyRows = () => {
    const rowgroups = screen.getAllByRole('rowgroup');
    const body = rowgroups.find((g) => g.tagName === 'TBODY');
    if (!body) throw new Error('tbody rowgroup not found');
    return within(body).getAllByRole('row');
  };

  it('paginates the results', async () => {
    const user = userEvent.setup();
    render(<AlertFieldsTable {...defaultProps} />);

    expect(getBodyRows()).toHaveLength(25);

    const next = screen.getByTestId('pagination-button-next');
    await user.click(next);

    // Wait for caption to reflect page 2 (or any async re-render) then assert row count
    await screen.findByText(/Page 2 of/i);
    expect(getBodyRows()).toHaveLength(8);
  });

  it('filters rows according to search string', async () => {
    render(<AlertFieldsTable {...defaultProps} />);

    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'kibana.alert.status' } });

    // Wait for filtered caption (1 rows out of 1) or the specific field cell
    await screen.findByText('kibana.alert.status');
    expect(getBodyRows()).toHaveLength(1);
  });
});
