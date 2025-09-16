/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFocusTrap, EuiOverlayMask, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { SerializedStyles } from '@emotion/serialize';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useMetricsGridState } from '../hooks';
import { RightSideActions } from './toolbar/right_side_actions/right_side_actions';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';

const getFullScreenStyles = (euiTheme: EuiThemeComputed): CSSObject => {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: euiTheme.colors.backgroundBasePlain,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    zIndex: euiTheme.levels.modal,
    overscrollBehavior: 'contain',
  };
};

interface FullScreenProps {
  isFullscreen: boolean;
  dataTestSubj?: string;
}

const FullScreenWrapper = ({
  isFullscreen,
  dataTestSubj,
  children,
}: React.PropsWithChildren<FullScreenProps>) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(() => getFullScreenStyles(euiTheme), [euiTheme]);

  if (!isFullscreen) return <>{children}</>;

  return (
    <EuiOverlayMask headerZindexLocation="above">
      <EuiFocusTrap>
        <div css={styles} data-test-subj={`${dataTestSubj}FullScreenWrapper`}>
          {children}
        </div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};

export interface MetricsGridWrapperProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  indexPattern: string;
  chartToolbarCss?: SerializedStyles;
  setDebouncedSearchTerm: (value: string) => void;
  fields: MetricField[];
  children?: React.ReactNode;
}

export const MetricsGridWrapper = ({
  indexPattern,
  renderToggleActions,
  chartToolbarCss,
  requestParams,
  setDebouncedSearchTerm,
  fields,
  children,
}: MetricsGridWrapperProps) => {
  const { leftSideActions } = useToolbarActions({
    fields,
    indexPattern,
    renderToggleActions,
    setDebouncedSearchTerm,
    requestParams,
  });
  const { searchTerm, onSearchTermChange, isFullscreen } = useMetricsGridState();

  return (
    <FullScreenWrapper isFullscreen={isFullscreen} dataTestSubj="metricsExperienceGrid">
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: leftSideActions,
          additionalControls: {
            prependRight: (
              <RightSideActions
                key="rightSideActions"
                searchTerm={searchTerm}
                onSearchTermChange={onSearchTermChange}
                fields={fields}
                indexPattern={indexPattern}
                renderToggleActions={renderToggleActions}
                requestParams={requestParams}
                setDebouncedSearchTerm={setDebouncedSearchTerm}
                data-test-subj="metricsExperienceToolbarSearchInput"
              />
            ),
          },
        }}
      >
        {children}
      </ChartSectionTemplate>
    </FullScreenWrapper>
  );
};
