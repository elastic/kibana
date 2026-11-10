/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useEffect } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { ChangeHistoryPreview } from '@kbn/change-history-ui';

/** the preview embeds a second dashboard renderer, so only load it once a change is previewed */
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

type PreviewProps = Parameters<ChangeHistoryPreviewRenderFn>[0];

export interface DashboardChangeHistoryViewProps {
  previewProps: PreviewProps;
  setPreviewTitle: (title: string) => void;
  inheritedTimeRange: DashboardState['time_range'];
}

/** switches between the rendered dashboard preview and the JSON comparison, depending on whether a comparison was requested */
export const DashboardChangeHistoryView = ({
  previewProps,
  setPreviewTitle,
  inheritedTimeRange,
}: DashboardChangeHistoryViewProps): JSX.Element => {
  const { compareSpec, compareMode, diffTelemetry } = previewProps;

  const isShowingComparison = Boolean(compareMode && compareSpec);
  const { title } = previewProps.change.snapshot as DashboardState;

  // dashboardPreview sets the title when mounted; the JSON comparison doesn't mount it
  useEffect(() => {
    if (isShowingComparison) setPreviewTitle(title);
  }, [isShowingComparison, title, setPreviewTitle]);

  if (isShowingComparison && compareSpec) {
    return (
      <ChangeHistoryPreview
        baseline={compareSpec.baseline.snapshot as object}
        target={compareSpec.target.snapshot as object}
        compareSpec={compareSpec}
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
