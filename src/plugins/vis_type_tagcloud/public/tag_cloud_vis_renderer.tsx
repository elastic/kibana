/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { TagCloudVisDependencies } from './plugin';
import { TagCloudVisRenderValue } from './tag_cloud_fn';

const TagCloudChart = lazy(() => import('./components/tag_cloud_chart'));

export const getTagCloudVisRenderer: (
  deps: TagCloudVisDependencies
) => ExpressionRenderDefinition<TagCloudVisRenderValue> = ({ palettes }) => ({
  name: 'tagloud_vis',
  displayName: 'Tag Cloud visualization',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const palettesRegistry = await palettes.getPalettes();

    render(
      <I18nProvider>
        <VisualizationContainer handlers={handlers}>
          <TagCloudChart
            {...config}
            palettesRegistry={palettesRegistry}
            renderComplete={handlers.done}
            fireEvent={handlers.event}
            syncColors={config.syncColors}
          />
        </VisualizationContainer>
      </I18nProvider>,
      domNode
    );
  },
});
