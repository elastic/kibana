/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

const tooltipTitle = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.tooltipTitle',
  {
    defaultMessage: 'Alert flapping detection',
  }
);

const flappingTitlePopoverFlappingDetection = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopoverFlappingDetection',
  {
    defaultMessage: 'flapping detection',
  }
);

const flappingTitlePopoverAlertStatus = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopoverAlertStatus',
  {
    defaultMessage: 'alert status change threshold',
  }
);

const flappingTitlePopoverLookBack = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopoverLookBack',
  {
    defaultMessage: 'rule run look back window',
  }
);

const flappingOffContentRules = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingOffContentRules',
  {
    defaultMessage: 'Rules',
  }
);

const flappingOffContentSettings = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingOffContentSettings',
  {
    defaultMessage: 'Settings',
  }
);

interface RuleSettingsFlappingTitleTooltipProps {
  isOpen: boolean;
  setIsPopoverOpen: (isOpen: boolean) => void;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
}

export const RuleSettingsFlappingTitleTooltip = (props: RuleSettingsFlappingTitleTooltipProps) => {
  const { isOpen, setIsPopoverOpen, anchorPosition = 'leftCenter' } = props;

  return (
    <EuiOutsideClickDetector onOutsideClick={() => setIsPopoverOpen(false)}>
      <EuiPopover
        repositionOnScroll
        isOpen={isOpen}
        anchorPosition={anchorPosition}
        panelStyle={{
          width: 500,
        }}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiButtonIcon
            data-test-subj="ruleSettingsFlappingTitleTooltipButton"
            display="empty"
            color="primary"
            iconType="questionInCircle"
            aria-label="Flapping title info"
            onClick={() => setIsPopoverOpen(!isOpen)}
          />
        }
      >
        <EuiPopoverTitle data-test-subj="ruleSettingsFlappingTooltipTitle">
          {tooltipTitle}
        </EuiPopoverTitle>
        <EuiText size="s">
          <FormattedMessage
            id="alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopover1"
            defaultMessage="When {flappingDetection} is turned on, alerts that switch quickly between active and recovered states are identified as “flapping” and notifications are reduced."
            values={{
              flappingDetection: <b>{flappingTitlePopoverFlappingDetection}</b>,
            }}
          />
        </EuiText>
        <EuiSpacer />
        <EuiText size="s">
          <FormattedMessage
            id="alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopover2"
            defaultMessage="The {alertStatus} defines a period (minimum number of runs) that is used in the detection algorithm. "
            values={{
              alertStatus: <b>{flappingTitlePopoverAlertStatus}</b>,
            }}
          />
        </EuiText>
        <EuiSpacer />
        <EuiText size="s">
          <FormattedMessage
            id="alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopover3"
            defaultMessage="The {lookBack} indicates the minimum number of times alerts must switch states within the threshold period to qualify as flapping alerts."
            values={{
              lookBack: <b>{flappingTitlePopoverLookBack}</b>,
            }}
          />
        </EuiText>
        <EuiSpacer />
        <EuiText size="s">
          <FormattedMessage
            id="alertsUIShared.ruleSettingsFlappingTitleTooltip.flappingTitlePopover4"
            defaultMessage="Go to {rules} > {settings} to turn on flapping detection for all rules in a space. You can subsequently customize the look back window and threshold values in each rule."
            values={{
              rules: <b>{flappingOffContentRules}</b>,
              settings: <b>{flappingOffContentSettings}</b>,
            }}
          />
        </EuiText>
      </EuiPopover>
    </EuiOutsideClickDetector>
  );
};
