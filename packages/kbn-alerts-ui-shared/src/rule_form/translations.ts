/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';

export const DOC_LINK_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.docLinkTitle',
  {
    defaultMessage: 'View documentation',
  }
);

export const LOADING_RULE_TYPE_PARAMS_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.loadingRuleTypeParamsTitle',
  {
    defaultMessage: 'Loading rule type params',
  }
);

export const SCHEDULE_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.scheduleTitle',
  {
    defaultMessage: 'Rule schedule',
  }
);

export const SCHEDULE_DESCRIPTION_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.scheduleDescriptionText',
  {
    defaultMessage: 'Set the frequency to check the alert conditions',
  }
);

export const SCHEDULE_TOOLTIP_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.scheduleTooltipText',
  {
    defaultMessage: 'Checks are queued; they run as close to the defined value as capacity allows.',
  }
);

export const ALERT_DELAY_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.alertDelayTitle',
  {
    defaultMessage: 'Alert delay',
  }
);

export const SCOPE_TITLE = i18n.translate('alertsUIShared.ruleForm.ruleDefinition.scopeTitle', {
  defaultMessage: 'Rule scope',
});

export const SCOPE_DESCRIPTION_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.scopeDescriptionText',
  {
    defaultMessage: 'Select the applications to associate the corresponding role privilege',
  }
);

export const ADVANCED_OPTIONS_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.advancedOptionsTitle',
  {
    defaultMessage: 'Advanced options',
  }
);

export const ALERT_DELAY_DESCRIPTION_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinition.alertDelayDescription',
  {
    defaultMessage:
      'Set the number of consecutive runs for which this rule must meet the alert conditions before an alert occurs',
  }
);

export const ALERT_DELAY_TITLE_PREFIX = i18n.translate(
  'alertsUIShared.ruleForm.ruleAlertDelay.alertDelayTitlePrefix',
  {
    defaultMessage: 'Alert after',
  }
);

export const SCHEDULE_TITLE_PREFIX = i18n.translate(
  'alertsUIShared.ruleForm.ruleSchedule.scheduleTitlePrefix',
  {
    defaultMessage: 'Every',
  }
);

export const ALERT_DELAY_TITLE_SUFFIX = i18n.translate(
  'alertsUIShared.ruleForm.ruleAlertDelay.alertDelayTitleSuffix',
  {
    defaultMessage: 'consecutive matches',
  }
);

export const ALERT_DELAY_HELP_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleAlertDelay.alertDelayHelpText',
  {
    defaultMessage:
      'An alert occurs only when the specified number of consecutive runs meet the rule conditions.',
  }
);

export const CONSUMER_SELECT_TITLE: string = i18n.translate(
  'alertsUIShared.ruleForm.ruleFormConsumerSelection.consumerSelectTitle',
  {
    defaultMessage: 'Role visibility',
  }
);

export const FEATURE_NAME_MAP: Record<string, string> = {
  [AlertConsumers.LOGS]: i18n.translate('alertsUIShared.ruleForm.ruleFormConsumerSelection.logs', {
    defaultMessage: 'Logs',
  }),
  [AlertConsumers.INFRASTRUCTURE]: i18n.translate(
    'alertsUIShared.ruleForm.ruleFormConsumerSelection.infrastructure',
    {
      defaultMessage: 'Metrics',
    }
  ),
  [AlertConsumers.APM]: i18n.translate('alertsUIShared.ruleForm.ruleFormConsumerSelection.apm', {
    defaultMessage: 'APM and User Experience',
  }),
  [AlertConsumers.UPTIME]: i18n.translate(
    'alertsUIShared.ruleForm.ruleFormConsumerSelection.uptime',
    {
      defaultMessage: 'Synthetics and Uptime',
    }
  ),
  [AlertConsumers.SLO]: i18n.translate('alertsUIShared.ruleForm.ruleFormConsumerSelection.slo', {
    defaultMessage: 'SLOs',
  }),
  [AlertConsumers.STACK_ALERTS]: i18n.translate(
    'alertsUIShared.ruleForm.ruleFormConsumerSelection.stackAlerts',
    {
      defaultMessage: 'Stack Rules',
    }
  ),
};

export const CONSUMER_SELECT_COMBO_BOX_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleFormConsumerSelection.consumerSelectComboBoxTitle',
  {
    defaultMessage: 'Select a scope',
  }
);

export const NAME_REQUIRED_TEXT = i18n.translate('alertsUIShared.ruleForm.error.requiredNameText', {
  defaultMessage: 'Name is required.',
});

export const CONSUMER_REQUIRED_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.error.requiredConsumerText',
  {
    defaultMessage: 'Scope is required.',
  }
);

export const INTERVAL_REQUIRED_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.error.requiredIntervalText',
  {
    defaultMessage: 'Check interval is required.',
  }
);

export const RULE_TYPE_REQUIRED_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.error.requiredRuleTypeIdText',
  {
    defaultMessage: 'Rule type is required.',
  }
);

export const RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.error.belowMinimumAlertDelayText',
  {
    defaultMessage: 'Alert delay must be greater than 1.',
  }
);

export const INTERVAL_MINIMUM_TEXT = (minimum: string) =>
  i18n.translate('alertsUIShared.ruleForm.error.belowMinimumText', {
    defaultMessage: 'Interval must be at least {minimum}.',
    values: { minimum },
  });

export const INTERVAL_WARNING_TEXT = (minimum: string) =>
  i18n.translate('alertsUIShared.ruleForm.intervalWarningText', {
    defaultMessage:
      'Intervals less than {minimum} are not recommended due to performance considerations.',
    values: { minimum },
  });

export const ADD_ACTION_TEXT = i18n.translate('alertsUIShared.ruleForm.ruleActions.addActionText', {
  defaultMessage: 'Add action',
});

export const RULE_DETAILS_TITLE = i18n.translate('alertsUIShared.ruleForm.ruleDetails.title', {
  defaultMessage: 'Rule name and tags',
});

export const RULE_DETAILS_DESCRIPTION = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.description',
  {
    defaultMessage: 'Define a name and tags for your rule.',
  }
);

export const RULE_NAME_INPUT_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.ruleNameInputTitle',
  {
    defaultMessage: 'Rule name',
  }
);

export const RULE_TAG_INPUT_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.ruleTagsInputTitle',
  {
    defaultMessage: 'Tags',
  }
);
