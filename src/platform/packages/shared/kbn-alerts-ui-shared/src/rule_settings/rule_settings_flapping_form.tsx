/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
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
import { getOnEnabledChange } from './rule_settings_on_enabled_change';

const flappingLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.flappingLabel', {
  defaultMessage: 'Flapping Detection',
});

const enabledOnLabel = i18n.translate('alertsUIShared.ruleSettingsFlappingForm.enabledOnLabel', {
  defaultMessage: 'On (recommended)',
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

  const [hideOverride, setHideOverride] = useState<boolean>(false);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  useEffect(() => {
    if (
      spaceFlappingSettings &&
      !spaceFlappingSettings.enabled &&
      flappingSettings &&
      flappingSettings.enabled
    ) {
      setHideOverride(true);
    }
    if (flappingSettings) {
      setIsCustom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFlappingOverrideToggle = useCallback(() => {
    if (!spaceFlappingSettings) {
      return;
    }
    if (flappingSettings) {
      cachedFlappingSettings.current = flappingSettings;
      setIsCustom(false);
      return onFlappingChange(null);
    }
    const initialFlappingSettings = cachedFlappingSettings.current || spaceFlappingSettings;
    setIsCustom(true);
    onFlappingChange({
      enabled: true,
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
      if (!spaceFlappingSettings) {
        return;
      }
      const { custom, flappingChange, hide } = getOnEnabledChange({
        enabled: value,
        spaceFlappingSettings,
        flappingSettings,
        cachedFlappingSettings: cachedFlappingSettings.current,
      });

      if (flappingChange != null) {
        internalOnFlappingChange(flappingChange);
      } else {
        onFlappingChange(flappingChange);
      }

      setIsCustom(custom);

      if (hide) {
        setHideOverride(hide);
      }
    },
    [spaceFlappingSettings, flappingSettings, onFlappingChange, internalOnFlappingChange]
  );

  const enabled = useMemo(() => {
    if (!spaceFlappingSettings) {
      return false;
    }

    return !flappingSettings
      ? spaceFlappingSettings.enabled
      : flappingSettings.enabled !== undefined
      ? flappingSettings.enabled
      : true; // default to true if flapping.enabled is undefined
  }, [spaceFlappingSettings, flappingSettings]);

  const flappingFormHeader = useMemo(() => {
    if (!spaceFlappingSettings) {
      return null;
    }

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
            {isCustom && (
              <EuiBadge
                data-test-subj="rulesSettingsFlappingCustomBadge"
                color="primary"
                style={{ height: '100%' }}
              >
                {flappingOverrideLabel}
              </EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="rulesSettingsFlappingEnableSwitch"
              compressed
              label={enabled ? enabledOnLabel : enabledOffLabel}
              checked={enabled}
              disabled={!canWriteFlappingSettingsUI}
              onChange={(e) => onEnabledChange(e.target.checked)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {enabled && (
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
    canWriteFlappingSettingsUI,
    enabled,
    onEnabledChange,
    isCustom,
  ]);

  const flappingFormBody = useMemo(() => {
    if (!flappingSettings || !enabled) {
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
    enabled,
  ]);

  const flappingFormSwitch = useMemo(() => {
    if (!enabled || hideOverride) {
      return null;
    }
    return (
      <EuiFlexItem>
        <EuiSwitch
          compressed
          data-test-subj="rulesSettingsFlappingCustomSwitch"
          checked={!!flappingSettings}
          label={flappingOverrideConfiguration}
          disabled={!canWriteFlappingSettingsUI}
          onChange={onFlappingOverrideToggle}
        />
      </EuiFlexItem>
    );
  }, [
    flappingSettings,
    canWriteFlappingSettingsUI,
    enabled,
    hideOverride,
    onFlappingOverrideToggle,
  ]);

  const flappingFormMessage = useMemo(() => {
    if (!spaceFlappingSettings || !enabled) {
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
  }, [spaceFlappingSettings, flappingSettings, euiTheme, enabled]);

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
