/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';

import { EuiButtonGroup, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { ChangeHistoryPreview, ChangeHistoryPreviewFooter } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import { getDashboardChangeHistoryCompareIndicator } from './get_dashboard_change_history_compare_indicator';

// the preview embeds a second dashboard renderer, so only load it once a change is previewed
const LazyDashboardPreview = lazy(async () => {
  const { DashboardPreview } = await import('./dashboard_preview');
  return { default: DashboardPreview };
});

type ViewMode = 'preview' | 'comparison';

const VIEW_MODE_OPTIONS = [
  {
    id: 'preview',
    label: i18n.translate('dashboard.changeHistory.previewMode', {
      defaultMessage: 'Preview',
    }),
    iconType: 'productDashboard',
  },
  {
    id: 'comparison',
    label: i18n.translate('dashboard.changeHistory.comparisonMode', {
      defaultMessage: 'Comparison',
    }),
    iconType: 'compare',
  },
] as const;

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
}

/** Switches between the rendered dashboard preview and the JSON comparison of a change. */
export const DashboardChangeHistoryPreview = ({
  previewProps,
  setPreviewTitle,
  inheritedTimeRange,
}: DashboardChangeHistoryPreviewProps): JSX.Element => {
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode>('preview');
  const { compareSpec, diffTelemetry } = previewProps;
  const canCompare = compareSpec !== undefined;
  console.log({ compareSpec });

  useEffect(() => {
    if (!compareSpec) setSelectedViewMode('preview');
    else if (compareSpec.comparisonType === 'vs_row') setSelectedViewMode('comparison');
  }, [compareSpec]);

  const viewModeToggle = (
    <EuiButtonGroup
      legend={i18n.translate('dashboard.changeHistory.viewModeLegend', {
        defaultMessage: 'Change view',
      })}
      buttonSize="compressed"
      isIconOnly
      options={[
        {
          id: 'preview',
          label: i18n.translate('dashboard.changeHistory.previewMode', {
            defaultMessage: 'Preview',
          }),
          iconType: 'productDashboard',
        },
        {
          id: 'comparison',
          label: i18n.translate('dashboard.changeHistory.comparisonMode', {
            defaultMessage: 'Comparison',
          }),
          iconType: 'compare',
          isDisabled: !canCompare,
        },
      ]}
      idSelected={selectedViewMode}
      onChange={(id) => setSelectedViewMode(id as ViewMode)}
      data-test-subj="dashboardChangeHistoryViewMode"
    />
  );

  if (selectedViewMode === 'comparison' && canCompare) {
    return (
      <ChangeHistoryPreview
        baseline={compareSpec.baseline.snapshot as object}
        target={compareSpec.target.snapshot as object}
        compareIndicator={getDashboardChangeHistoryCompareIndicator(compareSpec)}
        diffTelemetry={diffTelemetry}
        renderFooter={() => viewModeToggle}
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
      <ChangeHistoryPreviewFooter>{viewModeToggle}</ChangeHistoryPreviewFooter>
    </div>
  );
};
