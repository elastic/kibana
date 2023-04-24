/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
export const rule1Name = 'Rule 1 name';
const rule1Desc = 'Rule 1 description';
export const rule2Name = 'Rule 2 name';
const rule2Desc = 'Rule 2 description';

export const mockGroupingProps = {
  activePage: 0,
  data: {
    groupsCount: {
      value: 2,
    },
    groupByFields: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: [rule1Name, rule1Desc],
          key_as_string: `${rule1Name}|${rule1Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          alertsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
        {
          key: [rule2Name, rule2Desc],
          key_as_string: `${rule2Name}|${rule2Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          unitsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
      ],
    },
    unitsCount: {
      value: 2,
    },
  },
  groupingId: 'test-grouping-id',
  isLoading: false,
  itemsPerPage: 25,
  renderChildComponent: () => <p>{'child component'}</p>,
  onGroupClose: () => {},
  selectedGroup: 'kibana.alert.rule.name',
  takeActionItems: () => [
    <EuiContextMenuItem key="acknowledged" onClick={() => {}}>
      {'Mark as acknowledged'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="closed" onClick={() => {}}>
      {'Mark as closed'}
    </EuiContextMenuItem>,
  ],
  tracker: () => {},
};
