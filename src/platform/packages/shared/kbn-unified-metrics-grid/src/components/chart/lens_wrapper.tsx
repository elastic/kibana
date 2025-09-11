/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useBoolean } from '@kbn/react-hooks';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { MetricInsightsFlyout } from '../flyout/metrics_insights_flyout';

export type LensWrapperProps = {
  metric: MetricField;
  lensProps: LensProps;
} & Pick<ChartSectionProps, 'services' | 'onBrushEnd' | 'onFilter' | 'abortController'>;

const DEFAULT_DISABLED_ACTIONS = ['ACTION_CUSTOMIZE_PANEL', 'ACTION_EXPORT_CSV'];

export function LensWrapper({
  lensProps,
  metric,
  services,
  onBrushEnd,
  onFilter,
  abortController,
}: LensWrapperProps) {
  const { euiTheme } = useEuiTheme();
  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const [isFlyoutOpen, { toggle: toggleFlyoutOpen }] = useBoolean(false);

  const { EmbeddableComponent, SaveModalComponent } = services.lens;

  const esqlQuery = (lensProps?.attributes?.state?.query as AggregateQuery).esql ?? '';

  const chartCss = css`
    position: relative;
    height: 100%;

    & > div {
      position: absolute;
      height: 100%;
      width: 100%;
    }

    & .lnsExpressionRenderer {
      width: 100%;
      margin: auto;
      box-shadow: none;
    }

    & .echLegend .echLegendList {
      padding-right: ${euiTheme.size.s};
    }

    & > .euiLoadingChart {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  `;

  const extraActions = useLensExtraActions({
    copyToDashboard: { onClick: toggleSaveModalVisible },
    viewDetails: { onClick: toggleFlyoutOpen },
  });

  return (
    <>
      <div css={chartCss}>
        <EmbeddableComponent
          {...lensProps}
          extraActions={extraActions}
          abortController={abortController}
          disabledActions={DEFAULT_DISABLED_ACTIONS}
          withDefaultActions
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
        />
      </div>
      {isSaveModalVisible && (
        <SaveModalComponent
          initialInput={{ attributes: lensProps.attributes }}
          onClose={toggleSaveModalVisible}
          // Disables saving ESQL charts to the library.
          // it will only copy it to a dashboard
          isSaveable={false}
        />
      )}
      <MetricInsightsFlyout
        metric={metric}
        esqlQuery={esqlQuery}
        isOpen={isFlyoutOpen}
        onClose={toggleFlyoutOpen}
      />
    </>
  );
}
