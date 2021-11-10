/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { PersistedState } from '../../../../visualizations/public';
import { ExpressionRenderDefinition } from '../../../../expressions/common/expression_renderers';
import {
  EXPRESSION_HEATMAP_NAME,
  HeatmapExpressionProps,
  FilterEvent,
  BrushEvent,
} from '../../common';
import {
  getFormatService,
  getPaletteService,
  getUISettings,
  getThemeService,
  getDocLinks,
} from '../services';
import { getTimeZone } from '../utils/get_timezone';
import { SplitChartWarning } from './split_chart_warning';

import HeatmapComponent from '../compoments/heatmap_component';
import './index.scss';
const MemoizedChart = memo(HeatmapComponent);

export const heatmapRenderer = (): ExpressionRenderDefinition<HeatmapExpressionProps> => ({
  name: EXPRESSION_HEATMAP_NAME,
  displayName: i18n.translate('expressionHeatmap.visualizationName', {
    defaultMessage: 'Heatmap',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };

    // split chart will not be supported in the first release of the new implementation
    const isSplitChart = Boolean(config.args.splitRowAccessor || config.args.splitColumnAccessor);

    const timeZone = getTimeZone(getUISettings());
    render(
      <div className="heatmap-container" data-test-subj="heatmapContainer">
        {isSplitChart && <SplitChartWarning docLinks={getDocLinks()} />}
        <MemoizedChart
          {...config}
          onClickValue={onClickValue}
          onSelectRange={onSelectRange}
          timeZone={timeZone}
          formatFactory={getFormatService().deserialize}
          chartsThemeService={getThemeService()}
          paletteService={getPaletteService()}
          uiState={handlers.uiState as PersistedState}
        />
      </div>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
