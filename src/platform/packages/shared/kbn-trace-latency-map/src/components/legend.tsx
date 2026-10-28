/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LatencyMapColors } from '../hooks/use_latency_map_colors';
import type { LatencyMapUnit } from '../types';

const Ramp = ({
  colors,
  label,
  low,
  high,
}: {
  colors: string[];
  label: string;
  low: string;
  high: string;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiText size="xs" color="subdued">
        {low}
      </EuiText>
      <span
        aria-hidden="true"
        css={css`
          width: 80px;
          height: ${euiTheme.size.s};
          border-radius: ${euiTheme.border.radius.small};
          background: linear-gradient(to right, ${colors.join(',')});
        `}
      />
      <EuiText size="xs" color="subdued">
        {high}
      </EuiText>
    </EuiFlexGroup>
  );
};

/** Two ramps: opacity is how many, hue is how many of them failed. */
export function LatencyMapLegend({
  colors,
  unit,
}: {
  colors: LatencyMapColors;
  unit: LatencyMapUnit;
}) {
  return (
    <EuiFlexGroup gutterSize="l" wrap responsive={false} data-test-subj="traceLatencyMapLegend">
      <Ramp
        colors={colors.densityRamp}
        label={
          unit === 'traces'
            ? i18n.translate('traceLatencyMap.legend.tracesLabel', { defaultMessage: 'Traces' })
            : i18n.translate('traceLatencyMap.legend.spansLabel', { defaultMessage: 'Spans' })
        }
        low={i18n.translate('traceLatencyMap.legend.few', { defaultMessage: 'few' })}
        high={i18n.translate('traceLatencyMap.legend.many', { defaultMessage: 'many' })}
      />
      <Ramp
        colors={colors.failureRamp}
        label={i18n.translate('traceLatencyMap.legend.failureLabel', {
          defaultMessage: 'Failure rate',
        })}
        low="0%"
        high="100%"
      />
    </EuiFlexGroup>
  );
}
