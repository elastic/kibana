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

export type LensWrapperProps = {
  lensProps: LensProps | undefined;
} & Pick<ChartSectionProps, 'services' | 'onBrushEnd' | 'onFilter' | 'abortController'>;

export function LensWrapper({
  lensProps,
  services,
  onBrushEnd,
  onFilter,
  abortController,
}: LensWrapperProps) {
  const { euiTheme } = useEuiTheme();

  const lens = services.lens;

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

  return (
    lensProps && (
      <div css={chartCss}>
        <lens.EmbeddableComponent
          {...lensProps}
          abortController={abortController}
          withDefaultActions
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
        />
      </div>
    )
  );
}
