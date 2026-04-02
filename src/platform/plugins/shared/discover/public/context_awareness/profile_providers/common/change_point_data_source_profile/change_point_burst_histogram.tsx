/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { ChangePointBurstHistogramProps } from './types';
import {
  ChangePointLensEmbeddable,
  changePointExperienceLensWrapperCss,
} from './change_point_lens_embeddable';

const CHART_MIN_HEIGHT = 300;

/**
 * Burst detection timeline as a Lens bar chart (ES|QL): total entity count per time bucket.
 */
export const ChangePointBurstHistogram: React.FC<ChangePointBurstHistogramProps> = ({
  lens,
  attributes,
  abortController,
  lastReloadRequestTime,
  searchSessionId,
  timeRange,
  onBrushEnd,
  onFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const wrapperCss = changePointExperienceLensWrapperCss(euiTheme);

  if (!attributes) {
    return null;
  }

  return (
    <div
      css={css({
        minHeight: CHART_MIN_HEIGHT,
        padding: euiTheme.size.m,
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      })}
      data-test-subj="changePointBurstHistogram"
    >
      <ChangePointLensEmbeddable
        lens={lens}
        attributes={attributes}
        executionContextDescription="Discover change point burst histogram"
        id="discover-change-point-burst-lens"
        abortController={abortController}
        lastReloadRequestTime={lastReloadRequestTime}
        searchSessionId={searchSessionId}
        timeRange={timeRange}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        syncCursor={true}
        syncTooltips={true}
        wrapperCss={wrapperCss}
      />
    </div>
  );
};
