/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useSyncExternalStore } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiRange,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EXPERIMENTAL_COLORS_FLAG, useExperimentalColorsId } from './flag';
import type { Variant } from './types';
import { VARIANTS } from './variants';

const title = i18n.translate('expressionMetricVis.experimentalColors.panelTitle', {
  defaultMessage: 'Metric contrast',
});

const badgeLabel = i18n.translate('expressionMetricVis.experimentalColors.badgeLabel', {
  defaultMessage: 'Metric contrast',
});

const resetLabel = i18n.translate('expressionMetricVis.experimentalColors.resetLabel', {
  defaultMessage: 'Reset to defaults',
});

const defaultColorsHint = i18n.translate('expressionMetricVis.experimentalColors.defaultHint', {
  defaultMessage:
    'Metric tiles use their default colors. Set the {flag} feature flag to {variants} to tune them here.',
  values: { flag: EXPERIMENTAL_COLORS_FLAG, variants: Object.keys(VARIANTS).join(', ') },
});

const PANEL_WIDTH = 320;

const VariantControls = ({ variant: { targets, controls } }: { variant: Variant }) => {
  const values = useSyncExternalStore(targets.subscribe, targets.get);

  return (
    <>
      {controls.map((control) => {
        const { key, label } = control;
        const testSubj = `metricExperimentalColorsTarget-${key}`;
        if (control.type === 'switch') {
          return (
            <EuiFormRow key={key} display="rowCompressed">
              <EuiSwitch
                compressed
                label={label}
                checked={Boolean(values[key])}
                onChange={(event) => targets.set({ [key]: event.target.checked })}
                data-test-subj={testSubj}
              />
            </EuiFormRow>
          );
        }
        return (
          <EuiFormRow key={key} label={label} display="rowCompressed">
            <EuiRange
              compressed
              min={0}
              max={control.max}
              step={1}
              value={Number(values[key])}
              showInput
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                if (Number.isFinite(value)) targets.set({ [key]: value });
              }}
              aria-label={label}
              data-test-subj={testSubj}
            />
          </EuiFormRow>
        );
      })}
    </>
  );
};

/** Developer toolbar control for tuning the active variant's contrast targets. */
export const TargetsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const id = useExperimentalColorsId();
  const variant = id === 'default' ? undefined : VARIANTS[id];

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="#1E293B"
          iconType="paintBucket"
          iconSide="left"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel={title}
          data-test-subj="metricExperimentalColorsButton"
        >
          {badgeLabel}
        </EuiBadge>
      }
      offset={4}
      anchorPosition="upRight"
      repositionOnScroll
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      aria-label={title}
    >
      <EuiPopoverTitle>{`${title}: ${id}`}</EuiPopoverTitle>
      <div css={{ width: PANEL_WIDTH }}>
        {variant ? (
          <VariantControls key={id} variant={variant} />
        ) : (
          <EuiText size="s" color="subdued">
            {defaultColorsHint}
          </EuiText>
        )}
      </div>
      {variant && (
        <EuiPopoverFooter>
          <EuiButtonEmpty size="s" iconType="refresh" onClick={variant.targets.reset} flush="left">
            {resetLabel}
          </EuiButtonEmpty>
        </EuiPopoverFooter>
      )}
    </EuiPopover>
  );
};
