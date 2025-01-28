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

import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { RuleDefinition } from './rule_definition';
import { RuleType } from '@kbn/alerting-types';
import { RuleTypeModel } from '../common/types';
import { RuleSettingsFlappingFormProps } from '@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_form';
import { ALERT_FLAPPING_DETECTION_TITLE } from '../translations';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('../constants/rule_flapping', () => ({
  IS_RULE_SPECIFIC_FLAPPING_ENABLED: true,
}));

jest.mock('@kbn/alerts-ui-shared/src/rule_settings/rule_settings_flapping_form', () => ({
  RuleSettingsFlappingForm: (props: RuleSettingsFlappingFormProps) => (
    <div data-test-subj="ruleSettingsFlappingForm">
      <button
        onClick={() =>
          props.onFlappingChange({
            lookBackWindow: 15,
            statusChangeThreshold: 15,
          })
        }
      >
        onFlappingChange
      </button>
    </div>
  ),
}));

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
    alerts: { read: true, all: true },
    test: { read: true, all: true },
    stackAlerts: { read: true, all: true },
    logs: { read: true, all: true },
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

const plugins = {
  charts: {} as ChartsPluginSetup,
  data: {} as DataPublicPluginStart,
  dataViews: {} as DataViewsPublicPluginStart,
  unifiedSearch: {} as UnifiedSearchPublicPluginStart,
  docLinks: {} as DocLinksStart,
  application: {
    capabilities: {
      rulesSettings: {
        readFlappingSettingsUI: true,
        writeFlappingSettingsUI: true,
      },
    },
  },
};

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const mockOnChange = jest.fn();

describe('Rule Definition', () => {
  beforeEach(() => {
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'alerts',
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
      availableRuleTypes: [ruleType],
    });

    render(<RuleDefinition />);
    expect(screen.getByTestId('ruleDefinition')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSchedule')).toBeInTheDocument();
    expect(screen.getByTestId('ruleConsumerSelection')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDefinitionHeaderDocsLink')).toBeInTheDocument();
    expect(screen.getByTestId('alertDelay')).not.toBeVisible();

    expect(screen.getByText('Expression')).toBeInTheDocument();
  });

  test('Hides doc link if not provided', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'alerts',
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: {
        ...ruleModel,
        documentationUrl: null,
      },
      availableRuleTypes: [ruleType],
      validConsumers: ['logs', 'stackAlerts'],
    });
    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleDefinitionHeaderDocsLink')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if canShowConsumerSelection is false', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if there is only 1 consumer to select', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelect: true,
      validConsumers: ['logs'],
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if there are irrelevant consumers and only 1 consumer to select', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelect: true,
      validConsumers: ['logs', 'observability'],
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Hides consumer selection if valid consumers contain observability', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelect: true,
      validConsumers: ['logs', 'observability'],
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  test('Can toggle advanced options', async () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
    });

    render(<RuleDefinition />);

    fireEvent.click(screen.getByTestId('advancedOptionsAccordionButton'));
    expect(screen.getByTestId('alertDelay')).toBeVisible();
  });

  test('Calls onChange when inputs are modified', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
    });

    render(<RuleDefinition />);

    fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
      target: {
        value: '10',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setSchedule',
      payload: {
        interval: '10m',
      },
    });
  });

  test('should render rule flapping settings correctly', () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });

    render(<RuleDefinition />);

    expect(screen.getByText(ALERT_FLAPPING_DETECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('ruleSettingsFlappingForm')).toBeInTheDocument();
  });

  test('should hide flapping if the user does not have read access', async () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        charts: {} as ChartsPluginSetup,
        data: {} as DataPublicPluginStart,
        dataViews: {} as DataViewsPublicPluginStart,
        unifiedSearch: {} as UnifiedSearchPublicPluginStart,
        docLinks: {} as DocLinksStart,
        application: {
          capabilities: {
            rulesSettings: {
              readFlappingSettingsUI: false,
              writeFlappingSettingsUI: true,
            },
          },
        },
      },
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });

    render(<RuleDefinition />);

    expect(screen.queryByTestId('ruleDefinitionFlappingFormGroup')).not.toBeInTheDocument();
  });

  test('should allow flapping to be changed', async () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });

    render(<RuleDefinition />);

    await userEvent.click(screen.getByText('onFlappingChange'));
    expect(mockOnChange).toHaveBeenCalledWith({
      payload: {
        property: 'flapping',
        value: {
          lookBackWindow: 15,
          statusChangeThreshold: 15,
        },
      },
      type: 'setRuleProperty',
    });
  });

  test('should open and close flapping popover when button icon is clicked', async () => {
    useRuleFormState.mockReturnValue({
      plugins,
      formData: {
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
        ruleTypeId: '.es-query',
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      availableRuleTypes: [ruleType],
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });

    render(
      <IntlProvider locale="en">
        <RuleDefinition />
      </IntlProvider>
    );

    expect(screen.queryByTestId('ruleSettingsFlappingTooltipTitle')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleSettingsFlappingTitleTooltipButton'));

    expect(screen.queryByTestId('ruleSettingsFlappingTooltipTitle')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleSettingsFlappingTitleTooltipButton'));

    expect(screen.queryByTestId('ruleSettingsFlappingTooltipTitle')).not.toBeVisible();
  });
});
