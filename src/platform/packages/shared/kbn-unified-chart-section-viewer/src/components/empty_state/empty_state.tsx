/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiProgress,
  EuiDelayRender,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { IconChartBarStacked } from '@kbn/chart-icons';

interface EmptyStateProps {
  isLoading?: boolean;
}

export const EmptyState = ({ isLoading = false }: EmptyStateProps) => (
  <div
    css={css`
      height: 100%;
    `}
  >
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="spaceAround"
      css={css`
        height: 100%;
      `}
      gutterSize="s"
    >
      {isLoading ? (
        <EuiFlexItem>
          <EuiDelayRender delay={500}>
            <MetricsGridLoadingProgress />
          </EuiDelayRender>
        </EuiFlexItem>
      ) : (
        <>
          <EuiFlexItem
            css={css`
              justify-content: end;
            `}
          >
            <EuiIcon type={IconChartBarStacked as IconType} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" data-test-subj="metricsExperienceNoData">
              {i18n.translate('metricsExperience.grid.noData', {
                defaultMessage: 'No results found',
              })}
            </EuiText>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  </div>
);

export const MetricsGridLoadingProgress = () => (
  <EuiProgress
    size="xs"
    color="accent"
    position="absolute"
    data-test-subj="metricsExperienceProgressBar"
  />
);
