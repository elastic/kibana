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
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { ChangeHistoryPreview } from '@kbn/change-history-ui';

import { getDashboardChangeHistoryCompareIndicator } from './get_dashboard_change_history_compare_indicator';

// the preview embeds a second dashboard renderer, so only load it once a change is previewed
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

const layoutStyles = {
  container: css({
    display: 'grid',
    gridTemplateRows: '1fr auto',
    height: '100%',
    width: '100%',
  }),
  content: css({
    minHeight: 0,
    overflow: 'auto',
  }),
};

type PreviewProps = Parameters<ChangeHistoryPreviewRenderFn>[0];

export interface DashboardChangeHistoryPreviewProps {
  previewProps: PreviewProps;
  setPreviewTitle: (title: string) => void;
  inheritedTimeRange: React.ComponentProps<typeof LazyDashboardPreview>['inheritedTimeRange'];
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
  const selectedViewMode =
    compareSpec?.comparisonType === 'vs_row' || comparisonChangeId === change.id
      ? 'comparison'
      : 'preview';

  if (selectedViewMode === 'comparison' && compareSpec) {
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
    <div css={layoutStyles.container}>
      <div css={layoutStyles.content}>
        <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
          <LazyDashboardPreview
            {...previewProps}
            setPreviewTitle={setPreviewTitle}
            inheritedTimeRange={inheritedTimeRange}
          />
        </Suspense>
      </div>
    </div>
  );
};
