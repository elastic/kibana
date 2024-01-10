/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  Datatable,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import {
  type ChartSizeEvent,
  extractContainerType,
  extractVisualizationType,
  isOnAggBasedEditor,
} from '@kbn/chart-expressions-common';
import { VisTypePieDependencies } from '../plugin';
import { PARTITION_VIS_RENDERER_NAME } from '../../common/constants';
import { CellValueAction, GetCompatibleCellValueActions } from '../types';
import { ChartTypes, type PartitionVisParams, type PartitionChartProps } from '../../common/types';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.displayName', {
      defaultMessage: 'Partition visualization',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.helpDescription', {
      defaultMessage: 'Render pie/donut/treemap/mosaic/waffle charts',
    }),
};

const LazyPartitionVisComponent = lazy(() => import('../components/partition_vis_component'));
const PartitionVisComponent = withSuspense(LazyPartitionVisComponent);

const partitionVisRenderer = css({
  position: 'relative',
  width: '100%',
  height: '100%',
});

/**
 * Retrieves the compatible CELL_VALUE_TRIGGER actions indexed by column
 **/
export const getColumnCellValueActions = async (
  visConfig: PartitionVisParams,
  visData: Datatable,
  getCompatibleCellValueActions?: IInterpreterRenderHandlers['getCompatibleCellValueActions']
) => {
  if (!Array.isArray(visConfig.dimensions.buckets) || !getCompatibleCellValueActions) {
    return [];
  }
  return Promise.all(
    visConfig.dimensions.buckets.reduce<Array<Promise<CellValueAction[]>>>((acc, accessor) => {
      const columnMeta = getColumnByAccessor(accessor, visData.columns)?.meta;
      if (columnMeta) {
        acc.push(
          (getCompatibleCellValueActions as GetCompatibleCellValueActions)([{ columnMeta }])
        );
      }
      return acc;
    }, [])
  );
};

export const getPartitionVisRenderer: (
  deps: VisTypePieDependencies
) => ExpressionRenderDefinition<PartitionChartProps> = ({ getStartDeps }) => ({
  name: PARTITION_VIS_RENDERER_NAME,
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode,
    { visConfig, visData, visType, syncColors, canNavigateToLens, overrides },
    handlers
  ) => {
    const { core, plugins } = getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (containerType && visualizationType) {
        const events = [
          `render_${visualizationType}_${visType}`,
          canNavigateToLens ? `render_${visualizationType}_${visType}_convertable` : undefined,
        ].filter<string>((event): event is string => Boolean(event));

        plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, events);
      }
      handlers.done();
    };

    const [columnCellValueActions, palettesRegistry] = await Promise.all([
      getColumnCellValueActions(visConfig, visData, handlers.getCompatibleCellValueActions),
      plugins.charts.palettes.getPalettes(),
    ]);

    const hasOpenedOnAggBasedEditor = isOnAggBasedEditor(handlers.getExecutionContext());

    const chartSizeEvent: ChartSizeEvent = {
      name: 'chartSize',
      data: {
        maxDimensions: {
          x: { value: 100, unit: 'percentage' },
          y: { value: 100, unit: 'percentage' },
        },
      },
    };

    handlers.event(chartSizeEvent);

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <div css={partitionVisRenderer}>
            <PartitionVisComponent
              chartsThemeService={plugins.charts.theme}
              palettesRegistry={palettesRegistry}
              visParams={visConfig}
              visData={visData}
              visType={visConfig.isDonut ? ChartTypes.DONUT : visType}
              renderComplete={renderComplete}
              fireEvent={handlers.event}
              interactive={handlers.isInteractive()}
              uiState={handlers.uiState as PersistedState}
              services={{ data: plugins.data, fieldFormats: plugins.fieldFormats }}
              syncColors={syncColors}
              columnCellValueActions={columnCellValueActions}
              overrides={overrides}
              hasOpenedOnAggBasedEditor={hasOpenedOnAggBasedEditor}
            />
          </div>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode
    );
  },
});
