/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Store } from '@reduxjs/toolkit';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { cleanup, waitFor } from '@testing-library/react';
import { ShowRequestModal, ShowRequestModalProps } from './show_request_modal';
import { RuleFormRule } from '../../types';
import { renderWithProviders, waitForFormToLoad } from '../../common/test_utils';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { hydrateState } from '../../common/constants';

const shared = {
  id: '',
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
  consumer: AlertConsumers.STACK_ALERTS,
  ruleTypeId: 'test',
  schedule: { interval: '1m' },
  actions: [
    // {
    //   id: '0be65bf4-58b8-4c44-ba4d-5112c65103f5',
    //   actionTypeId: '.server-log',
    //   group: 'query matched',
    //   params: {
    //     level: 'info',
    //     message:
    //       "Elasticsearch query rule '{{rule.name}}' is active:\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}\n- Link: {{context.link}}",
    //   },
    //   frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    //   uuid: 'a330a154-61fb-42a8-9bce-9dfd8513a12d',
    // },
  ],
  tags: ['test'],
  name: 'test',
};

const rule: RuleFormRule = { ...shared };

const editRule: RuleFormRule = {
  ...shared,
  id: '0de7273e-c5db-4d5c-8e28-1aab363e1abc',
};

const ShowRequestModalWithProviders: React.FunctionComponent<ShowRequestModalProps> = (props) => (
  <IntlProvider locale="en">
    <ShowRequestModal {...props} />
  </IntlProvider>
);

describe('rules_settings_modal', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('renders create request correctly', async () => {
    const modalProps: ShowRequestModalProps = {
      onClose: jest.fn(),
    };
    let store: Store;
    const result = renderWithProviders(<ShowRequestModalWithProviders {...modalProps} />, {
      onInitStore: (providedStore) => {
        store = providedStore;
      },
    });
    await waitForFormToLoad();
    await waitFor(() => {
      expect(store).toBeDefined();
      store.dispatch(hydrateState(rule));
    });

    await waitFor(async () => {
      expect(result.getByTestId('modalHeaderTitle').textContent).toBe(
        'Create alerting rule request'
      );
      expect(result.getByTestId('modalSubtitle').textContent).toBe(
        'This Kibana request will create this rule.'
      );
      expect(result.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
        "POST kbn:/api/alerting/rule
        {
          \\"name\\": \\"test\\",
          \\"tags\\": [
            \\"test\\"
          ],
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
          \\"schedule\\": {
            \\"interval\\": \\"1m\\"
          },
          \\"consumer\\": \\"stackAlerts\\",
          \\"rule_type_id\\": \\"test\\",
          \\"actions\\": []
        }"
      `);
    });
  });

  test('renders edit request correctly', async () => {
    const modalProps: ShowRequestModalProps = {
      isEdit: true,
      onClose: jest.fn(),
    };
    const result = renderWithProviders(<ShowRequestModalWithProviders {...modalProps} />, {
      existingRuleMock: editRule,
      isEdit: true,
    });
    await waitForFormToLoad();

    expect(result.getByTestId('modalHeaderTitle').textContent).toBe('Edit alerting rule request');
    expect(result.getByTestId('modalSubtitle').textContent).toBe(
      'This Kibana request will edit this rule.'
    );
    expect(result.getByTestId('modalRequestCodeBlock').textContent).toMatchInlineSnapshot(`
      "PUT kbn:/api/alerting/rule/0de7273e-c5db-4d5c-8e28-1aab363e1abc
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
        \\"actions\\": [],
        \\"alert_delay\\": null
      }"
    `);
  });
});
