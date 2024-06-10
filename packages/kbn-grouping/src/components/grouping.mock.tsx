/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
export const host1Name = 'nice-host';
export const host2Name = 'cool-host';

export const mockGroupingProps = {
  activePage: 0,
  data: {
    groupsCount: {
      value: 3,
    },
    groupByFields: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: [host1Name],
          key_as_string: `${host1Name}`,
          selectedGroup: 'host.name',
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          hostTags: {
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
          key: [host2Name],
          key_as_string: `${host2Name}`,
          selectedGroup: 'host.name',
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          hostTags: {
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
        {
          key: ['-'],
          key_as_string: `-`,
          selectedGroup: 'host.name',
          isNullGroup: true,
          doc_count: 11,
          hostsCountAggregation: {
            value: 11,
          },
          hostTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          alertsCount: {
            value: 11,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 11,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 11,
          },
          usersCountAggregation: {
            value: 11,
          },
        },
      ],
    },
    unitsCount: {
      value: 14,
    },
    unitsCountWithoutNull: {
      value: 14,
    },
  },
  groupingId: 'test-grouping-id',
  isLoading: false,
  itemsPerPage: 25,
  renderChildComponent: () => <p>{'child component'}</p>,
  onGroupClose: () => {},
  selectedGroup: 'host.name',
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
