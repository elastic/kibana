/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

const getLookBackWindowLabelRuleRuns = (amount: number) => {
  return i18n.translate('alertsUIShared.ruleSettingsFlappingMessage.lookBackWindowLabelRuleRuns', {
    defaultMessage: '{amount, number} rule {amount, plural, one {run} other {runs}}',
    values: { amount },
  });
};

const getStatusChangeThresholdRuleRuns = (amount: number) => {
  return i18n.translate('alertsUIShared.ruleSettingsFlappingMessage.statusChangeThresholdTimes', {
    defaultMessage: '{amount, number} {amount, plural, one {time} other {times}}',
    values: { amount },
  });
};

export const flappingOffMessage = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingMessage.flappingOffMessage',
  {
    defaultMessage:
      'Alert flapping detection is off. Alerts will be generated based on the rule interval, which might result in higher alert volumes.',
  }
);

export interface RuleSettingsFlappingMessageProps {
  lookBackWindow: number;
  statusChangeThreshold: number;
}

export const RuleSettingsFlappingMessage = (props: RuleSettingsFlappingMessageProps) => {
  const { lookBackWindow, statusChangeThreshold } = props;

  return (
    <EuiText size="s" data-test-subj="ruleSettingsFlappingMessage">
      <FormattedMessage
        id="alertsUIShared.ruleSettingsFlappingMessage.flappingSettingsDescription"
        defaultMessage="An alert is flapping if it changes status at least {statusChangeThreshold} in the last {lookBackWindow}."
        values={{
          lookBackWindow: <b>{getLookBackWindowLabelRuleRuns(lookBackWindow)}</b>,
          statusChangeThreshold: <b>{getStatusChangeThresholdRuleRuns(statusChangeThreshold)}</b>,
        }}
      />
    </EuiText>
  );
};
