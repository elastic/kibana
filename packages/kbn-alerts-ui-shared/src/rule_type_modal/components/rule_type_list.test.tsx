/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleTypeList } from './rule_type_list';
import { RuleTypeWithDescription } from '../types';

const ruleTypes: RuleTypeWithDescription[] = [
  {
    id: '1',
    name: 'B - Rule Type 1',
    enabledInLicense: true,
    description: 'Description 1',
    actionVariables: {
      params: [],
    },
    authorizedConsumers: {},
    actionGroups: [],
    producer: 'stackAlerts',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: {
      id: '1',
      name: 'default',
    },
    defaultActionGroupId: '1',
  },
  {
    id: '2',
    name: 'Rule Type 2',
    enabledInLicense: false,
    description: 'Description 2',
    actionVariables: {
      params: [],
    },
    authorizedConsumers: {},
    actionGroups: [],
    producer: 'stackAlerts',
    minimumLicenseRequired: 'platinum',
    recoveryActionGroup: {
      id: '2',
      name: 'default',
    },
    defaultActionGroupId: '2',
  },
  {
    id: '3',
    name: 'A - Rule Type 3',
    enabledInLicense: true,
    description: 'Description 3',
    actionVariables: {
      params: [],
    },
    authorizedConsumers: {},
    actionGroups: [],
    producer: 'stackAlerts',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: {
      id: '3',
      name: 'default',
    },
    defaultActionGroupId: '3',
  },
];

describe('RuleTypeList', () => {
  it('should sort by enabled in license first and then alphabetically', async () => {
    render(
      <RuleTypeList
        ruleTypes={ruleTypes}
        onSelectRuleType={jest.fn()}
        onFilterByProducer={jest.fn()}
        selectedProducer={null}
        ruleTypeCountsByProducer={{
          total: 3,
          'Stack Alerts': 3,
        }}
        onClearFilters={jest.fn()}
        showCategories={false}
      />
    );

    const ruleListEl = await screen.findAllByTestId('-SelectOption', { exact: false });
    const firstRuleInList = within(ruleListEl[0]).getByRole('button', { name: 'A - Rule Type 3' });
    expect(firstRuleInList).not.toBeDisabled();
    const secondRuleInList = within(ruleListEl[1]).getByRole('button', { name: 'B - Rule Type 1' });
    expect(secondRuleInList).not.toBeDisabled();
    const thirdRuleInList = within(ruleListEl[2]).getByRole('button', { name: 'Rule Type 2' });
    expect(thirdRuleInList).toBeDisabled();

    await userEvent.hover(ruleListEl[2]);
    expect(await screen.findByText('This rule requires a platinum license.')).toBeInTheDocument();
  });
});
