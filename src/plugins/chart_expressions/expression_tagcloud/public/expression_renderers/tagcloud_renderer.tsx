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
import { i18n } from '@kbn/i18n';
import { ExpressionRenderDefinition } from '../../../../expressions/common';
import { VisualizationContainer } from '../../../../visualizations/public';
import { withSuspense } from '../../../../presentation_util/public';
import { TagcloudRendererConfig } from '../../common/types';
import { ExpressioTagcloudRendererDependencies } from '../plugin';
import { EXPRESSION_NAME } from '../../common';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionTagcloud.renderer.tagcloud.displayName', {
      defaultMessage: 'Tag Cloud visualization',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionTagcloud.renderer.tagcloud.helpDescription', {
      defaultMessage: 'Render a tag cloud',
    }),
};

const LazyTagcloudComponent = lazy(() => import('../components/tagcloud_component'));
const TagcloudComponent = withSuspense(LazyTagcloudComponent);

export const tagcloudRenderer: (
  deps: ExpressioTagcloudRendererDependencies
) => ExpressionRenderDefinition<TagcloudRendererConfig> = ({ palettes }) => ({
  name: EXPRESSION_NAME,
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const palettesRegistry = await palettes.getPalettes();

    render(
      <I18nProvider>
        <VisualizationContainer handlers={handlers}>
          <TagcloudComponent
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
