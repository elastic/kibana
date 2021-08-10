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
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '../../../../presentation_util/public';
import { TagcloudRendererConfig } from '../../common/types';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionTagcloud.renderer.tagcloud.displayName', {
      defaultMessage: 'Image reveal',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionTagcloud.renderer.tagcloud.helpDescription', {
      defaultMessage: 'Reveal a percentage of an image to make a custom gauge-style chart',
    }),
};

const LazyTagcloudComponent = lazy(() => import('../components/tagcloud_component'));
const TagcloudComponent = withSuspense(LazyTagcloudComponent);

export const tagcloudRenderer = (): ExpressionRenderDefinition<TagcloudRendererConfig> => ({
  name: 'tagcloud',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: (
    domNode: HTMLElement,
    config: TagcloudRendererConfig,
    handlers: IInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <TagcloudComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
      </I18nProvider>,
      domNode
    );
  },
});
