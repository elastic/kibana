/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { ChangeHistoryPreview } from '@kbn/change-history-ui';

import { getDashboardChangeHistoryCompareIndicator } from './get_dashboard_change_history_compare_indicator';

// the preview embeds a second dashboard renderer, so only load it once a change is previewed
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

type PreviewProps = Parameters<ChangeHistoryPreviewRenderFn>[0];

export interface DashboardChangeHistoryPreviewProps {
  previewProps: PreviewProps;
  setPreviewTitle: (title: string) => void;
  inheritedTimeRange: DashboardState['time_range'];
  /** Id of the change whose comparison was requested from the timeline. */
  comparisonChangeId?: string;
}

/** Switches between the rendered dashboard preview and the JSON comparison of a change. */
export const DashboardChangeHistoryPreview = ({
  previewProps,
  setPreviewTitle,
  inheritedTimeRange,
  comparisonChangeId,
}: DashboardChangeHistoryPreviewProps): JSX.Element => {
  const { compareSpec, diffTelemetry, change } = previewProps;

  const isComparison = comparisonChangeId && comparisonChangeId === change?.id && compareSpec;
  if (isComparison) {
    return (
      <ChangeHistoryPreview
        baseline={compareSpec.baseline.snapshot as object}
        target={compareSpec.target.snapshot as object}
        compareIndicator={getDashboardChangeHistoryCompareIndicator(compareSpec)}
        diffTelemetry={diffTelemetry}
        language="json"
      />
    );
  }

  return (
    <div css={contentStyles}>
      <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
        <LazyDashboardPreview
          {...previewProps}
          setPreviewTitle={setPreviewTitle}
          inheritedTimeRange={inheritedTimeRange}
        />
      </Suspense>
    </div>
  );
};

const contentStyles = css({
  height: '100%',
  width: '100%',
  overflow: 'auto',
});
