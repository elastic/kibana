/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { RuleDefinition } from './rule_definition';
import { RuleTypeModel } from '../types';
import { RuleType } from '@kbn/alerting-types';
import { ALERT_DELAY_TITLE } from '../translations';

const ruleType = {
  id: '.es-query',
  name: 'Test',
  actionGroups: [
    {
      id: 'testActionGroup',
      name: 'Test Action Group',
    },
    {
      id: 'recovered',
      name: 'Recovered',
    },
  ],
  defaultActionGroupId: 'testActionGroup',
  minimumLicenseRequired: 'basic',
  recoveryActionGroup: 'recovered',
  producer: 'logs',
  authorizedConsumers: {
    alerting: { read: true, all: true },
    test: { read: true, all: true },
  },
  actionVariables: {
    params: [],
    state: [],
  },
  enabledInLicense: true,
} as unknown as RuleType;

const ruleModel: RuleTypeModel = {
  id: '.es-query',
  description: 'Sample rule type model',
  iconClass: 'sampleIconClass',
  documentationUrl: 'testurl',
  validate: (params, isServerless) => ({ errors: {} }),
  ruleParamsExpression: () => <div>Expression</div>,
  defaultActionMessage: 'Sample default action message',
  defaultRecoveryMessage: 'Sample default recovery message',
  requiresAppContext: false,
};

const requiredPlugins = {
  charts: {} as ChartsPluginSetup,
  data: {} as DataPublicPluginStart,
  dataViews: {} as DataViewsPublicPluginStart,
  unifiedSearch: {} as UnifiedSearchPublicPluginStart,
  docLinks: {} as DocLinksStart,
};

const mockOnChange = jest.fn();

describe('Rule Definition', () => {
  test('Renders correctly', () => {
    render(
      <RuleDefinition
        requiredPlugins={requiredPlugins}
        formValues={{
          id: 'test-id',
          params: {},
          schedule: {
            interval: '1m',
          },
          alertDelay: {
            active: 5,
          },
          notifyWhen: null,
          consumer: 'stackAlerts',
        }}
        selectedRuleType={ruleType as RuleType}
        selectedRuleTypeModel={ruleModel as RuleTypeModel}
        canShowConsumerSelection
        authorizedConsumers={['logs', 'stackAlerts']}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByTestId('ruleDefinition')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSchedule')).toBeInTheDocument();
    expect(screen.getByTestId('ruleConsumerSelection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDefinitionHeaderDocsLink')).toBeInTheDocument();

    expect(screen.getByText(ALERT_DELAY_TITLE)).not.toBeVisible();
    expect(screen.getByText('Expression')).toBeInTheDocument();
  });

  test('Hides doc link if not provided', () => {
    render(
      <RuleDefinition
        requiredPlugins={requiredPlugins}
        formValues={{
          id: 'test-id',
          params: {},
          schedule: {
            interval: '1m',
          },
          alertDelay: {
            active: 5,
          },
          notifyWhen: null,
          consumer: 'stackAlerts',
        }}
        selectedRuleType={ruleType}
        selectedRuleTypeModel={{
          ...ruleModel,
          documentationUrl: null,
        }}
        canShowConsumerSelection
        authorizedConsumers={['logs', 'stackAlerts']}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByTestId('ruleDefinitionHeaderDocsLink')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if canShowConsumerSelection is false', () => {
    render(
      <RuleDefinition
        requiredPlugins={requiredPlugins}
        formValues={{
          id: 'test-id',
          params: {},
          schedule: {
            interval: '1m',
          },
          alertDelay: {
            active: 5,
          },
          notifyWhen: null,
          consumer: 'stackAlerts',
        }}
        selectedRuleType={ruleType}
        selectedRuleTypeModel={ruleModel}
        authorizedConsumers={['logs', 'stackAlerts']}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Can toggle advanced options', async () => {
    render(
      <RuleDefinition
        requiredPlugins={requiredPlugins}
        formValues={{
          id: 'test-id',
          params: {},
          schedule: {
            interval: '1m',
          },
          alertDelay: {
            active: 5,
          },
          notifyWhen: null,
          consumer: 'stackAlerts',
        }}
        selectedRuleType={ruleType}
        selectedRuleTypeModel={ruleModel}
        authorizedConsumers={['logs', 'stackAlerts']}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByTestId('advancedOptionsAccordionButton'));
    expect(screen.getByText(ALERT_DELAY_TITLE)).toBeVisible();
  });

  test('Calls onChange when inputs are modified', () => {
    render(
      <RuleDefinition
        requiredPlugins={requiredPlugins}
        formValues={{
          id: 'test-id',
          params: {},
          schedule: {
            interval: '1m',
          },
          alertDelay: {
            active: 5,
          },
          notifyWhen: null,
          consumer: 'stackAlerts',
        }}
        selectedRuleType={ruleType}
        selectedRuleTypeModel={ruleModel}
        authorizedConsumers={['logs', 'stackAlerts']}
        onChange={mockOnChange}
      />
    );

    fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
      target: {
        value: '10',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith('interval', '10m');
  });
});
