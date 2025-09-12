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
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { ChartTitle } from './chart_title';
import { useMetricsGridState } from '../../hooks/use_metrics_grid_state';

export type LensWrapperProps = {
  lensProps: LensProps;
  metricName: string;
} & Pick<ChartSectionProps, 'services' | 'onBrushEnd' | 'onFilter' | 'abortController'>;

const DEFAULT_DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_EXPORT_CSV',
  // temporarily disabiling it until we figure out this action
  'ACTION_OPEN_IN_DISCOVER',
];

export function LensWrapper({
  lensProps,
  services,
  onBrushEnd,
  onFilter,
  abortController,
  metricName,
}: LensWrapperProps) {
  const { euiTheme } = useEuiTheme();
  const [isSaveModalVisible, { toggle: toggleSaveModalVisible }] = useBoolean(false);
  const { searchTerm } = useMetricsGridState();

  const { EmbeddableComponent, SaveModalComponent } = services.lens;

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
      padding-top: ${euiTheme.size.l};
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
  });

  return (
    <>
      <div css={chartCss}>
        <ChartTitle searchTerm={searchTerm} text={metricName} truncation="end" />
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
    </>
  );
}
