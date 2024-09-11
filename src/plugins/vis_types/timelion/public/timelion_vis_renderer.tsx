/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { RangeFilterParams } from '@kbn/es-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { KibanaExecutionContext } from '@kbn/core/public';
import { TimelionVisDependencies } from './plugin';
import { TimelionRenderValue } from './timelion_vis_fn';
import { getCoreStart, getUsageCollection } from './helpers/plugin_services';

const LazyTimelionVisComponent = lazy(() =>
  import('./async_services').then(({ TimelionVisComponent }) => ({ default: TimelionVisComponent }))
);

/** @internal **/
const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

export const getTimelionVisRenderer: (
  deps: TimelionVisDependencies
) => ExpressionRenderDefinition<TimelionRenderValue> = (deps) => ({
  name: 'timelion_vis',
  displayName: 'Timelion visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visParams, syncTooltips, syncCursor }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const seriesList = visData?.sheet[0];
    const showNoResult = !seriesList || !seriesList.list.length;

    const onBrushEvent = (rangeFilterParams: RangeFilterParams) => {
      handlers.event({
        name: 'applyFilter',
        data: {
          timeFieldName: '*',
          filters: [
            {
              query: {
                range: {
                  '*': rangeFilterParams,
                },
              },
            },
          ],
        },
      });
    };

    const renderComplete = () => {
      const usageCollection = getUsageCollection();
      const containerType = extractContainerType(handlers.getExecutionContext());

      if (usageCollection && containerType) {
        usageCollection.reportUiCounter(
          containerType,
          METRIC_TYPE.COUNT,
          `render_agg_based_timelion`
        );
      }
      handlers.done();
    };

    render(
      <KibanaRenderContextProvider {...getCoreStart()}>
        <VisualizationContainer
          renderComplete={renderComplete}
          handlers={handlers}
          showNoResult={showNoResult}
        >
          <KibanaContextProvider services={{ ...deps }}>
            {seriesList && (
              <LazyTimelionVisComponent
                interval={visParams.interval}
                ariaLabel={visParams.ariaLabel}
                seriesList={seriesList}
                renderComplete={renderComplete}
                onBrushEvent={onBrushEvent}
                syncTooltips={syncTooltips}
                syncCursor={syncCursor}
              />
            )}
          </KibanaContextProvider>
        </VisualizationContainer>
      </KibanaRenderContextProvider>,

      domNode
    );
  },
});
