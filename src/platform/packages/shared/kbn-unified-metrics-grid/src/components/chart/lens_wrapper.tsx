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
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { ChartTitle } from './chart_title';

export type LensWrapperProps = {
  lensProps: LensProps;
  titleHighlight?: string;
  onViewDetails?: () => void;
  onCopyToDashboard?: () => void;
  syncTooltips?: boolean;
  syncCursor?: boolean;
} & Pick<ChartSectionProps, 'services' | 'onBrushEnd' | 'onFilter' | 'abortController'>;

const DEFAULT_DISABLED_ACTIONS = ['ACTION_CUSTOMIZE_PANEL', 'ACTION_EXPORT_CSV', 'alertRule'];

export function LensWrapper({
  lensProps,
  services,
  onBrushEnd,
  onFilter,
  abortController,
  titleHighlight,
  onViewDetails,
  onCopyToDashboard,
  syncTooltips,
  syncCursor,
}: LensWrapperProps) {
  const { euiTheme } = useEuiTheme();

  const { EmbeddableComponent } = services.lens;

  const chartCss = css`
    position: relative;
    height: 100%;

    & > div {
      position: absolute;
      height: 100%;
      width: 100%;
    }

    & .embPanel__header {
      visibility: hidden;
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
    copyToDashboard: onCopyToDashboard ? { onClick: onCopyToDashboard } : undefined,
    viewDetails: onViewDetails ? { onClick: onViewDetails } : undefined,
  });

  return (
    <div css={chartCss}>
      <ChartTitle highlight={titleHighlight} title={lensProps.attributes.title} />
      <EmbeddableComponent
        {...lensProps}
        title={lensProps.attributes.title}
        extraActions={extraActions}
        abortController={abortController}
        disabledActions={DEFAULT_DISABLED_ACTIONS}
        withDefaultActions
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        syncTooltips={syncTooltips}
        syncCursor={syncCursor}
      />
    </div>
  );
}
