/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export const RULE_NAME_INPUT_BUTTON_ARIA_LABEL = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.ruleNameInputButtonAriaLabel',
  {
    defaultMessage: 'Save rule name',
  }
);

export const RULE_TAG_INPUT_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.ruleTagsInputTitle',
  {
    defaultMessage: 'Tags',
  }
);

export const RULE_TAG_PLACEHOLDER = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetails.ruleTagsPlaceholder',
  {
    defaultMessage: 'Add tags',
  }
);

export const RULE_NAME_ARIA_LABEL_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.rulePage.ruleNameAriaLabelText',
  {
    defaultMessage: 'Edit rule name',
  }
);

export const RULE_PAGE_FOOTER_CANCEL_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.rulePageFooter.cancelText',
  {
    defaultMessage: 'Cancel',
  }
);

export const RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.rulePageFooter.showRequestText',
  {
    defaultMessage: 'Show request',
  }
);

export const RULE_PAGE_FOOTER_CREATE_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.rulePageFooter.createText',
  {
    defaultMessage: 'Create rule',
  }
);

export const RULE_PAGE_FOOTER_SAVE_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.rulePageFooter.saveText',
  {
    defaultMessage: 'Save rule',
  }
);

export const HEALTH_CHECK_ALERTS_ERROR_TITLE = i18n.translate(
  'alertsUIShared.healthCheck.alertsErrorTitle',
  {
    defaultMessage: 'You must enable Alerting and Actions',
  }
);

export const HEALTH_CHECK_ALERTS_ERROR_TEXT = i18n.translate(
  'alertsUIShared.healthCheck.alertsErrorText',
  {
    defaultMessage: 'To create a rule, you must enable the alerting and actions plugins.',
  }
);

export const HEALTH_CHECK_ENCRYPTION_ERROR_TITLE = i18n.translate(
  'alertsUIShared.healthCheck.encryptionErrorTitle',
  {
    defaultMessage: 'Additional setup required',
  }
);

export const HEALTH_CHECK_ENCRYPTION_ERROR_TEXT = i18n.translate(
  'alertsUIShared.healthCheck.encryptionErrorText',
  {
    defaultMessage: 'You must configure an encryption key to use Alerting.',
  }
);

export const HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TITLE = i18n.translate(
  'alertsUIShared.healthCheck.healthCheck.apiKeysAndEncryptionErrorTitle',
  {
    defaultMessage: 'Additional setup required',
  }
);

export const HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TEXT = i18n.translate(
  'alertsUIShared.healthCheck.apiKeysAndEncryptionErrorText',
  {
    defaultMessage: 'You must enable API keys and configure an encryption key to use Alerting.',
  }
);

export const HEALTH_CHECK_API_KEY_DISABLED_ERROR_TITLE = i18n.translate(
  'alertsUIShared.healthCheck.apiKeysDisabledErrorTitle',
  {
    defaultMessage: 'Additional setup required',
  }
);

export const HEALTH_CHECK_API_KEY_DISABLED_ERROR_TEXT = i18n.translate(
  'alertsUIShared.healthCheck.apiKeysDisabledErrorText',
  {
    defaultMessage: 'You must enable API keys to use Alerting.',
  }
);

export const HEALTH_CHECK_ACTION_TEXT = i18n.translate('alertsUIShared.healthCheck.actionText', {
  defaultMessage: 'Learn more.',
});

export const RULE_FORM_ROUTE_PARAMS_ERROR_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.routeParamsErrorTitle',
  {
    defaultMessage: 'Unable to load rule form.',
  }
);

export const RULE_FORM_ROUTE_PARAMS_ERROR_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.routeParamsErrorText',
  {
    defaultMessage: 'There was an error loading the rule form. Please ensure the route is correct.',
  }
);

export const RULE_FORM_RULE_TYPE_NOT_FOUND_ERROR_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleTypeNotFoundErrorTitle',
  {
    defaultMessage: 'Unable to load rule type.',
  }
);

export const RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleNotFoundErrorTitle',
  {
    defaultMessage: 'Unable to load rule',
  }
);

export const RULE_FORM_RULE_TYPE_NOT_FOUND_ERROR_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleTypeNotFoundErrorText',
  {
    defaultMessage:
      'There was an error loading the rule type. Please ensure you have access to the rule type selected.',
  }
);

export const RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.ruleNotFoundErrorText',
  {
    defaultMessage:
      'There was an error loading the rule. Please ensure you have access to the rule selected.',
  }
);

export const RULE_CREATE_SUCCESS_TEXT = (ruleName: string) =>
  i18n.translate('alertsUIShared.ruleForm.createSuccessText', {
    defaultMessage: 'Created rule "{ruleName}"',
    values: {
      ruleName,
    },
  });

export const RULE_CREATE_ERROR_TEXT = i18n.translate('alertsUIShared.ruleForm.createErrorText', {
  defaultMessage: 'Cannot create rule.',
});

export const RULE_EDIT_ERROR_TEXT = i18n.translate('alertsUIShared.ruleForm.editErrorText', {
  defaultMessage: 'Cannot update rule.',
});

export const RULE_EDIT_SUCCESS_TEXT = (ruleName: string) =>
  i18n.translate('alertsUIShared.ruleForm.editSuccessText', {
    defaultMessage: 'Updated "{ruleName}"',
    values: {
      ruleName,
    },
  });

export const CIRCUIT_BREAKER_SEE_FULL_ERROR_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.circuitBreakerSeeFullErrorText',
  {
    defaultMessage: 'See full error',
  }
);

export const CIRCUIT_BREAKER_HIDE_FULL_ERROR_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.circuitBreakerHideFullErrorText',
  {
    defaultMessage: 'Hide full error',
  }
);

export const CONFIRMATION_RULE_SAVE_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.confirmRuleSaveTitle',
  {
    defaultMessage: 'Save rule with no actions?',
  }
);

export const CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.confirmRuleSaveConfirmButtonText',
  {
    defaultMessage: 'Save rule',
  }
);

export const CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.confirmRuleSaveCancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

export const CONFIRM_RULE_SAVE_MESSAGE_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.confirmRuleSaveMessageText',
  {
    defaultMessage: 'You can add an action at anytime.',
  }
);

export const RULE_FORM_PAGE_RULE_DEFINITION_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDefinitionTitle',
  {
    defaultMessage: 'Rule definition',
  }
);

export const RULE_FORM_PAGE_RULE_ACTIONS_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleActionsTitle',
  {
    defaultMessage: 'Actions',
  }
);

export const RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleActionsNoPermissionTitle',
  {
    defaultMessage: 'Actions and connectors privileges missing',
  }
);

export const RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_DESCRIPTION = i18n.translate(
  'alertsUIShared.ruleForm.ruleActionsNoPermissionDescription',
  {
    defaultMessage: 'You must have read access to actions and connectors to edit rules.',
  }
);

export const RULE_FORM_PAGE_RULE_DETAILS_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.ruleDetailsTitle',
  {
    defaultMessage: 'Rule details',
  }
);

export const RULE_FORM_RETURN_TITLE = i18n.translate('alertsUIShared.ruleForm.returnTitle', {
  defaultMessage: 'Return',
});

export const MODAL_SEARCH_PLACEHOLDER = i18n.translate(
  'alertsUIShared.ruleForm.modalSearchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const MODAL_SEARCH_CLEAR_FILTERS_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.modalSearchClearFiltersText',
  {
    defaultMessage: 'Clear filters',
  }
);

export const ACTION_TYPE_MODAL_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.actionTypeModalTitle',
  {
    defaultMessage: 'Select connector',
  }
);

export const ACTION_TYPE_MODAL_FILTER_ALL = i18n.translate(
  'alertsUIShared.ruleForm.actionTypeModalFilterAll',
  {
    defaultMessage: 'All',
  }
);

export const ACTION_TYPE_MODAL_EMPTY_TITLE = i18n.translate(
  'alertsUIShared.ruleForm.actionTypeModalEmptyTitle',
  {
    defaultMessage: 'No connectors found',
  }
);

export const ACTION_TYPE_MODAL_EMPTY_TEXT = i18n.translate(
  'alertsUIShared.ruleForm.actionTypeModalEmptyText',
  {
    defaultMessage: 'Try a different search or change your filter settings.',
  }
);

export const ACTION_ERROR_TOOLTIP = i18n.translate(
  'alertsUIShared.ruleActionsItem.actionErrorToolTip',
  {
    defaultMessage: 'Action contains errors.',
  }
);

export const ACTION_WARNING_TITLE = i18n.translate(
  'alertsUIShared.ruleActionsItem.actionWarningsTitle',
  {
    defaultMessage: '1 warning',
  }
);

export const TECH_PREVIEW_LABEL = i18n.translate('alertsUIShared.technicalPreviewBadgeLabel', {
  defaultMessage: 'Technical preview',
});

export const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'alertsUIShared.technicalPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);
