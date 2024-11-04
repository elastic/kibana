/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiOutsideClickDetector,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleSpecificFlappingProperties, RulesSettingsFlapping } from '@kbn/alerting-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleSettingsFlappingMessage } from './rule_settings_flapping_message';
import { RuleSettingsFlappingInputs } from './rule_settings_flapping_inputs';

const flappingLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.flappingLabel', {
  defaultMessage: 'Flapping Detection',
});

const flappingOnLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.onLabel', {
  defaultMessage: 'ON',
});

const flappingOffLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.offLabel', {
  defaultMessage: 'OFF',
});

const flappingOverrideLabel = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.overrideLabel',
  {
    defaultMessage: 'Custom',
  }
);

const flappingOffContentRules = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.flappingOffContentRules',
  {
    defaultMessage: 'Rules',
  }
);

const flappingOffContentSettings = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.flappingOffContentSettings',
  {
    defaultMessage: 'Settings',
  }
);

const flappingExternalLinkLabel = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.flappingExternalLinkLabel',
  {
    defaultMessage: "What's this?",
  }
);

const flappingOverrideConfiguration = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.flappingOverrideConfiguration',
  {
    defaultMessage: 'Customize Configuration',
  }
);

const clampFlappingValues = (flapping: RuleSpecificFlappingProperties) => {
  return {
    ...flapping,
    statusChangeThreshold: Math.min(flapping.lookBackWindow, flapping.statusChangeThreshold),
  };
};

export interface RuleSettingsFlappingFormProps {
  flappingSettings?: RuleSpecificFlappingProperties | null;
  spaceFlappingSettings?: RulesSettingsFlapping;
  canWriteFlappingSettingsUI: boolean;
  onFlappingChange: (value: RuleSpecificFlappingProperties | null) => void;
}

export const RuleSettingsFlappingForm = (props: RuleSettingsFlappingFormProps) => {
  const { flappingSettings, spaceFlappingSettings, canWriteFlappingSettingsUI, onFlappingChange } =
    props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const cachedFlappingSettings = useRef<RuleSpecificFlappingProperties>();

  const isDesktop = useIsWithinMinBreakpoint('xl');

  const { euiTheme } = useEuiTheme();

  const onFlappingToggle = useCallback(() => {
    if (!spaceFlappingSettings) {
      return;
    }
    if (flappingSettings) {
      cachedFlappingSettings.current = flappingSettings;
      return onFlappingChange(null);
    }
    const initialFlappingSettings = cachedFlappingSettings.current || spaceFlappingSettings;
    onFlappingChange({
      lookBackWindow: initialFlappingSettings.lookBackWindow,
      statusChangeThreshold: initialFlappingSettings.statusChangeThreshold,
    });
  }, [spaceFlappingSettings, flappingSettings, onFlappingChange]);

  const internalOnFlappingChange = useCallback(
    (flapping: RuleSpecificFlappingProperties) => {
      const clampedValue = clampFlappingValues(flapping);
      onFlappingChange(clampedValue);
      cachedFlappingSettings.current = clampedValue;
    },
    [onFlappingChange]
  );

  const onLookBackWindowChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      internalOnFlappingChange({
        ...flappingSettings,
        lookBackWindow: value,
      });
    },
    [flappingSettings, internalOnFlappingChange]
  );

  const onStatusChangeThresholdChange = useCallback(
    (value: number) => {
      if (!flappingSettings) {
        return;
      }
      internalOnFlappingChange({
        ...flappingSettings,
        statusChangeThreshold: value,
      });
    },
    [flappingSettings, internalOnFlappingChange]
  );

  const flappingOffTooltip = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }
    const { enabled } = spaceFlappingSettings;
    if (enabled) {
      return null;
    }

    if (canWriteFlappingSettingsUI) {
      return (
        <EuiOutsideClickDetector onOutsideClick={() => setIsPopoverOpen(false)}>
          <EuiPopover
            repositionOnScroll
            isOpen={isPopoverOpen}
            anchorPosition="leftCenter"
            panelStyle={{
              width: 250,
            }}
            button={
              <EuiButtonIcon
                data-test-subj="ruleSettingsFlappingFormTooltipButton"
                display="empty"
                color="primary"
                iconType="questionInCircle"
                aria-label="Flapping Off Info"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              />
            }
          >
            <EuiText data-test-subj="ruleSettingsFlappingFormTooltipContent" size="s">
              <FormattedMessage
                id="alertsUIShared.ruleSettingsFlappingForm.flappingOffPopoverContent"
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
    }
    // TODO: Add the external doc link here!
    return (
      <EuiLink href="" target="_blank">
        {flappingExternalLinkLabel}
      </EuiLink>
    );
  }, [canWriteFlappingSettingsUI, isPopoverOpen, spaceFlappingSettings]);

  const flappingFormHeader = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }
    const { enabled } = spaceFlappingSettings;

    return (
      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="s"
          direction={isDesktop ? 'row' : 'column'}
          alignItems={isDesktop ? 'center' : undefined}
        >
          <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
            <EuiText size="s" style={{ marginRight: euiTheme.size.xs }}>
              {flappingLabel}
            </EuiText>
            <EuiBadge color={enabled ? 'success' : 'default'} style={{ height: '100%' }}>
              {enabled ? flappingOnLabel : flappingOffLabel}
            </EuiBadge>
            {flappingSettings && enabled && (
              <EuiBadge color="primary" style={{ height: '100%' }}>
                {flappingOverrideLabel}
              </EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {enabled && (
              <EuiSwitch
                data-test-subj="ruleFormAdvancedOptionsOverrideSwitch"
                compressed
                checked={!!flappingSettings}
                label={flappingOverrideConfiguration}
                disabled={!canWriteFlappingSettingsUI}
                onChange={onFlappingToggle}
              />
            )}
            {flappingOffTooltip}
          </EuiFlexItem>
        </EuiFlexGroup>
        {flappingSettings && enabled && (
          <>
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </>
        )}
      </EuiFlexItem>
    );
  }, [
    isDesktop,
    euiTheme,
    spaceFlappingSettings,
    flappingSettings,
    flappingOffTooltip,
    canWriteFlappingSettingsUI,
    onFlappingToggle,
  ]);

  const flappingFormBody = useMemo(() => {
    if (!flappingSettings) {
      return null;
    }
    if (!spaceFlappingSettings?.enabled) {
      return null;
    }
    return (
      <EuiFlexItem>
        <RuleSettingsFlappingInputs
          lookBackWindow={flappingSettings.lookBackWindow}
          statusChangeThreshold={flappingSettings.statusChangeThreshold}
          onLookBackWindowChange={onLookBackWindowChange}
          onStatusChangeThresholdChange={onStatusChangeThresholdChange}
          isDisabled={!canWriteFlappingSettingsUI}
        />
      </EuiFlexItem>
    );
  }, [
    flappingSettings,
    spaceFlappingSettings,
    canWriteFlappingSettingsUI,
    onLookBackWindowChange,
    onStatusChangeThresholdChange,
  ]);

  const flappingFormMessage = useMemo(() => {
    if (!spaceFlappingSettings || !spaceFlappingSettings.enabled) {
      return null;
    }
    const settingsToUse = flappingSettings || spaceFlappingSettings;
    return (
      <EuiSplitPanel.Inner
        color="subdued"
        style={{
          borderTop: euiTheme.border.thin,
        }}
      >
        <RuleSettingsFlappingMessage
          lookBackWindow={settingsToUse.lookBackWindow}
          statusChangeThreshold={settingsToUse.statusChangeThreshold}
          isUsingRuleSpecificFlapping={!!flappingSettings}
        />
      </EuiSplitPanel.Inner>
    );
  }, [spaceFlappingSettings, flappingSettings, euiTheme]);

  return (
    <EuiSplitPanel.Outer hasBorder>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column">
          {flappingFormHeader}
          {flappingFormBody}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {flappingFormMessage}
    </EuiSplitPanel.Outer>
  );
};
