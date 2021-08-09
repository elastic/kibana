/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '../../../presentation_util/public';
import { ShapeRendererConfig } from '../../common/types';
import { LazyShapeComponent } from '../components/shape';

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionShape.renderer.shape.displayName', {
      defaultMessage: 'Shape',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionShape.renderer.shape.helpDescription', {
      defaultMessage: 'Render a basic shape',
    }),
};

const ShapeComponent = withSuspense(LazyShapeComponent);

export const shapeRenderer = (): ExpressionRenderDefinition<ShapeRendererConfig> => ({
  name: 'shape',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    config: ShapeRendererConfig,
    handlers: IInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <ShapeComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
      </I18nProvider>,
      domNode
    );
  },
});
