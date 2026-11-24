/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiRange,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  resetSubduedTargets,
  setSubduedTargets,
  useSubduedTargets,
} from '../services/subdued_targets';
import type { SubduedTargets } from './metric_tile_colors';

interface Slider {
  key: keyof SubduedTargets;
  label: string;
  max: number;
}

const SLIDERS: readonly Slider[] = [
  {
    key: 'fill',
    label: i18n.translate('expressionMetricVis.subduedTargets.fillLabel', {
      defaultMessage: 'Fill',
    }),
    max: 100,
  },
  {
    key: 'ink',
    label: i18n.translate('expressionMetricVis.subduedTargets.inkLabel', {
      defaultMessage: 'Value',
    }),
    max: 106,
  },
  {
    key: 'trend',
    label: i18n.translate('expressionMetricVis.subduedTargets.trendLabel', {
      defaultMessage: 'Trend area',
    }),
    max: 100,
  },
  {
    key: 'trendLine',
    label: i18n.translate('expressionMetricVis.subduedTargets.trendLineLabel', {
      defaultMessage: 'Trend line',
    }),
    max: 100,
  },
  {
    key: 'noTrendExtraFill',
    label: i18n.translate('expressionMetricVis.subduedTargets.noTrendExtraFillLabel', {
      defaultMessage: 'No trend: fill boost',
    }),
    max: 20,
  },
];

const title = i18n.translate('expressionMetricVis.subduedTargets.title', {
  defaultMessage: 'Metric contrast (APCA Lc)',
});

const badgeLabel = i18n.translate('expressionMetricVis.subduedTargets.badgeLabel', {
  defaultMessage: 'Metric Lc',
});

const resetLabel = i18n.translate('expressionMetricVis.subduedTargets.resetLabel', {
  defaultMessage: 'Reset to defaults',
});

const PANEL_WIDTH = 320;

/** Developer toolbar control for experimenting with the subdued metric tiles' contrast targets. */
export const SubduedTargetsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const targets = useSubduedTargets();

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="#1E293B"
          iconType="paintBucket"
          iconSide="left"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel={title}
          data-test-subj="metricSubduedTargetsButton"
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
      <EuiPopoverTitle>{title}</EuiPopoverTitle>
      <div css={{ width: PANEL_WIDTH }}>
        {SLIDERS.map(({ key, label, max }) => (
          <EuiFormRow key={key} label={label} display="rowCompressed">
            <EuiRange
              compressed
              min={0}
              max={max}
              step={1}
              value={targets[key]}
              showInput
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                if (Number.isFinite(value)) setSubduedTargets({ [key]: value });
              }}
              aria-label={label}
              data-test-subj={`metricSubduedTargets-${key}`}
            />
          </EuiFormRow>
        ))}
      </div>
      <EuiPopoverFooter>
        <EuiButtonEmpty size="s" iconType="refresh" onClick={resetSubduedTargets} flush="left">
          {resetLabel}
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
