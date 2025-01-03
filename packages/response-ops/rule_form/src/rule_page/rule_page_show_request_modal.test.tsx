/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePageShowRequestModal } from './rule_page_show_request_modal';
import { RuleFormData } from '../types';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('../hooks');

const formData: RuleFormData = {
  params: {
    searchType: 'esQuery',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [1000],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: 'created_at',
  },
  actions: [],
  consumer: 'stackAlerts',
  ruleTypeId: '.es-query',
  schedule: { interval: '1m' },
  tags: ['test'],
  name: 'test',
};

const onCloseMock = jest.fn();

describe('rulePageShowRequestModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders create request correctly', async () => {
    useRuleFormState.mockReturnValue({ formData, multiConsumerSelection: 'logs' });

    render(<RulePageShowRequestModal onClose={onCloseMock} />);

    expect(screen.getByTestId('modalHeaderTitle').textContent).toBe('Create alerting rule request');
    expect(screen.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will create this rule.'
    );
    expect(screen.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "POST kbn:/api/alerting/rule
      {
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"consumer\\": \\"logs\\",
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"tags\\": [
          \\"test\\"
        ],
        \\"name\\": \\"test\\",
        \\"rule_type_id\\": \\".es-query\\",
        \\"actions\\": []
      }"
    `);
  });

  test('renders edit request correctly', async () => {
    useRuleFormState.mockReturnValue({
      formData,
      multiConsumerSelection: 'logs',
      id: 'test-id',
    });

    render(<RulePageShowRequestModal isEdit onClose={onCloseMock} />);

    expect(screen.getByTestId('modalHeaderTitle').textContent).toBe('Edit alerting rule request');
    expect(screen.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will edit this rule.'
    );
    expect(screen.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "PUT kbn:/api/alerting/rule/test-id
      {
        \\"name\\": \\"test\\",
        \\"tags\\": [
          \\"test\\"
        ],
        \\"schedule\\": {
          \\"interval\\": \\"1m\\"
        },
        \\"params\\": {
          \\"searchType\\": \\"esQuery\\",
          \\"timeWindowSize\\": 5,
          \\"timeWindowUnit\\": \\"m\\",
          \\"threshold\\": [
            1000
          ],
          \\"thresholdComparator\\": \\">\\",
          \\"size\\": 100,
          \\"esQuery\\": \\"{\\\\n    \\\\\\"query\\\\\\":{\\\\n      \\\\\\"match_all\\\\\\" : {}\\\\n    }\\\\n  }\\",
          \\"aggType\\": \\"count\\",
          \\"groupBy\\": \\"all\\",
          \\"termSize\\": 5,
          \\"excludeHitsFromPreviousRun\\": false,
          \\"sourceFields\\": [],
          \\"index\\": [
            \\".kibana\\"
          ],
          \\"timeField\\": \\"created_at\\"
        },
        \\"actions\\": []
      }"
    `);
  });

  test('can close modal', () => {
    useRuleFormState.mockReturnValue({
      formData,
      multiConsumerSelection: 'logs',
      id: 'test-id',
    });

    render(<RulePageShowRequestModal isEdit onClose={onCloseMock} />);
    fireEvent.click(screen.getByLabelText('Closes this modal window'));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
