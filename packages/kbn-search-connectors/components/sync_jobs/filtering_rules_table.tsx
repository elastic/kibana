/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiCode } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { filteringPolicyToText, filteringRuleToText } from '../../utils/filtering_rule_helpers';
import { FilteringRule, FilteringPolicy, FilteringRuleRule } from '../..';

interface FilteringRulesTableProps {
  filteringRules: FilteringRule[];
  showOrder: boolean;
}

export const FilteringRulesTable: React.FC<FilteringRulesTableProps> = ({
  showOrder,
  filteringRules,
}) => {
  const columns: Array<EuiBasicTableColumn<FilteringRule>> = [
    ...(showOrder
      ? [
          {
            field: 'order',
            name: i18n.translate('searchConnectors.index.filtering.priority', {
              defaultMessage: 'Rule priority',
            }),
          },
        ]
      : []),
    {
      field: 'policy',
      name: i18n.translate('searchConnectors.index.filtering.policy', {
        defaultMessage: 'Policy',
      }),
      render: (policy: FilteringPolicy) => filteringPolicyToText(policy),
    },
    {
      field: 'field',
      name: i18n.translate('searchConnectors.index.filtering.field', {
        defaultMessage: 'field',
      }),
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
    {
      field: 'rule',
      name: i18n.translate('searchConnectors.index.filtering.rule', {
        defaultMessage: 'Rule',
      }),
      render: (rule: FilteringRuleRule) => filteringRuleToText(rule),
    },
    {
      field: 'value',
      name: i18n.translate('searchConnectors.index.filtering.value', {
        defaultMessage: 'Value',
      }),
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
  ];
  return (
    <EuiBasicTable
      columns={columns}
      items={filteringRules.sort(({ order }, { order: secondOrder }) => order - secondOrder)}
    />
  );
};
