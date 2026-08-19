/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  applyDesignExplorationKnobCssVars,
  getDesignExplorationKnobDefinitions,
  getDesignExplorationKnobValues,
  notifyDesignExplorationKnobsChanged,
  resetDesignExplorationKnobValues,
  setDesignExplorationKnobValue,
  type DesignExplorationKnobId,
} from './design_exploration_knobs';
import { getActiveDesignExplorationVariant } from './design_exploration_variants';
import { DESIGN_EXPLORATION_BODY_ATTR } from './design_exploration_shared';

const KNOBS_PANEL_ATTR = 'data-design-exploration-knobs-panel';

const badgeStyles = css`
  cursor: pointer;
`;

const getPanelStyles = () => css`
  position: fixed;
  right: 16px;
  bottom: 56px;
  z-index: 12000;
  width: 280px;
  max-height: calc(100vh - 96px);
  overflow: auto;
`;

/** Variant form-control overrides leak into the dev toolbar; keep panel inputs on the dark theme. */
const getPanelFormControlStyles = (backgroundColor: string, borderColor: string) => {
  const panelScope = `body[${DESIGN_EXPLORATION_BODY_ATTR}='true'] &[${KNOBS_PANEL_ATTR}='true']`;

  return css`
    ${panelScope}
    .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true'])):not(:has(:disabled)),
    ${panelScope} .euiFormControlButton:not(:focus):not(:disabled):not([aria-invalid='true']) {
      background-color: ${backgroundColor} !important;
      border: 1px solid ${borderColor} !important;
      border-radius: 4px !important;
      box-shadow: none !important;
    }

    ${panelScope}
    .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
    input:not(:focus):not(:disabled),
    ${panelScope}
    .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
    select:not(:focus):not(:disabled),
    ${panelScope}
    .euiFormControlLayout:not(.euiFormControlLayout--group):not(:has(:invalid, [aria-invalid='true']))
    textarea:not(:focus):not(:disabled) {
      background-color: transparent !important;
    }
  `;
};

export const DesignExplorationKnobsPanel = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const panelTitleId = useGeneratedHtmlId({ prefix: 'designExplorationKnobsTitle' });
  const activeVariant = getActiveDesignExplorationVariant();
  const knobDefinitions = useMemo(
    () => getDesignExplorationKnobDefinitions(activeVariant.disabledKnobIds),
    [activeVariant.disabledKnobIds]
  );
  const knobValues = useMemo(
    () => getDesignExplorationKnobValues(activeVariant.id),
    [activeVariant.id, revision]
  );

  const applyKnobs = useCallback(() => {
    applyDesignExplorationKnobCssVars(activeVariant.knobTokens, activeVariant.id, colorMode);
    notifyDesignExplorationKnobsChanged();
    setRevision((current) => current + 1);
  }, [activeVariant, colorMode]);

  const onKnobChange = useCallback(
    (knobId: DesignExplorationKnobId, value: number) => {
      setDesignExplorationKnobValue(activeVariant.id, knobId, value);
      applyKnobs();
    },
    [activeVariant.id, applyKnobs]
  );

  const onReset = useCallback(() => {
    resetDesignExplorationKnobValues(activeVariant.id);
    applyKnobs();
  }, [activeVariant.id, applyKnobs]);

  return (
    <>
      <EuiToolTip content="Tune design exploration knobs for the active variant.">
        <EuiBadge
          color="#0B1628"
          css={badgeStyles}
          iconType="controlsHorizontal"
          iconSide="left"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel="Toggle design exploration knobs panel"
        >
          Knobs
        </EuiBadge>
      </EuiToolTip>

      {isOpen && (
        <EuiPanel
          css={[
            getPanelStyles(),
            getPanelFormControlStyles(euiTheme.colors.backgroundBasePlain, euiTheme.border.color),
          ]}
          paddingSize="m"
          hasShadow
          aria-labelledby={panelTitleId}
          {...{ [KNOBS_PANEL_ATTR]: 'true' }}
        >
          <EuiTitle size="xxs">
            <h2 id={panelTitleId}>Design knobs</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {activeVariant.label}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiForm>
            {knobDefinitions.map(({ id, label, min, max, step, ticks }) => (
              <EuiFormRow key={id} label={label} fullWidth>
                {ticks ? (
                  <EuiButtonGroup
                    isFullWidth
                    legend={label}
                    type="single"
                    buttonSize="compressed"
                    options={ticks.map(({ label: tickLabel, value }) => ({
                      id: String(value),
                      label: tickLabel,
                      'data-test-subj': `designExplorationKnob-${id}-${value}`,
                    }))}
                    idSelected={String(knobValues[id])}
                    onChange={(selectedId) => onKnobChange(id, Number(selectedId))}
                  />
                ) : (
                  <EuiRange
                    fullWidth
                    min={min}
                    max={max}
                    step={step}
                    value={knobValues[id]}
                    showInput
                    showLabels
                    aria-label={label}
                    onChange={(event) => onKnobChange(id, Number(event.currentTarget.value))}
                  />
                )}
              </EuiFormRow>
            ))}
          </EuiForm>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={onReset}>
                Reset variant
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={() => setIsOpen(false)}>
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </>
  );
};
