/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useEffect } from 'react';

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { i18n } from '@kbn/i18n';
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
  const { compareSpec, compareMode, diffTelemetry, isLoadingCompareContext } = previewProps;

  // stay on the comparison for as long as it is requested, even while loading or after a failed load
  const isShowingComparison = Boolean(compareMode);
  const { title } = previewProps.change.snapshot as DashboardState;

  // dashboardPreview sets the title when mounted; the JSON comparison doesn't mount it
  useEffect(() => {
    if (isShowingComparison) setPreviewTitle(title);
  }, [isShowingComparison, title, setPreviewTitle]);

  if (isShowingComparison) {
    if (compareSpec) {
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

    if (isLoadingCompareContext) {
      return (
        <div css={contentStyles}>
          <EuiLoadingSpinner size="xl" data-test-subj="dashboardCompareLoading" />
        </div>
      );
    }

    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        data-test-subj="dashboardCompareError"
        title={
          <h2>
            {i18n.translate('dashboard.changeHistory.compareErrorTitle', {
              defaultMessage: 'Unable to load the comparison',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('dashboard.changeHistory.compareErrorBody', {
              defaultMessage:
                'The version to compare against could not be loaded. Try again, or select a different version.',
            })}
          </p>
        }
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
