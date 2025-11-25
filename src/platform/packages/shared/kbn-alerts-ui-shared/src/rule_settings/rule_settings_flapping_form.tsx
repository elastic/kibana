/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleSpecificFlappingProperties, RulesSettingsFlapping } from '@kbn/alerting-types';
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

const enabledOnLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.enabledOnLabel', {
  defaultMessage: 'On',
});

const enabledOffLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.enabledOffLabel', {
  defaultMessage: 'Off',
});

const flappingOverrideLabel = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingForm.overrideLabel',
  {
    defaultMessage: 'Custom',
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
      enabled: initialFlappingSettings.enabled,
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

  const onEnabledChange = useCallback(
    (value: boolean) => {
      if (!flappingSettings) {
        return;
      }
      internalOnFlappingChange({
        ...flappingSettings,
        enabled: value,
      });
    },
    [flappingSettings, internalOnFlappingChange]
  );

  const flappingFormHeader = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }
    const enabled = !flappingSettings ? spaceFlappingSettings.enabled : flappingSettings.enabled;

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
            <EuiSwitch
              data-test-subj="ruleFormAdvancedOptionsOverrideSwitch"
              compressed
              checked={!!flappingSettings}
              label={flappingOverrideConfiguration}
              disabled={!canWriteFlappingSettingsUI}
              onChange={onFlappingToggle}
            />
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
    canWriteFlappingSettingsUI,
    onFlappingToggle,
  ]);

  const flappingFormBody = useMemo(() => {
    if (!flappingSettings) {
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
    canWriteFlappingSettingsUI,
    onLookBackWindowChange,
    onStatusChangeThresholdChange,
  ]);

  const flappingFormSwitch = useMemo(() => {
    if (!flappingSettings) {
      return null;
    }

    return (
      <EuiFlexItem>
        <EuiSwitch
          label={flappingSettings.enabled ? enabledOnLabel : enabledOffLabel}
          checked={flappingSettings.enabled || false}
          disabled={!canWriteFlappingSettingsUI}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
      </EuiFlexItem>
    );
  }, [flappingSettings, canWriteFlappingSettingsUI, onEnabledChange]);

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
          {flappingFormSwitch}
          {flappingFormBody}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {flappingFormMessage}
    </EuiSplitPanel.Outer>
  );
};
