/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { CoreTheme } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense, defaultTheme$ } from '@kbn/presentation-util-plugin/public';
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

export const getShapeRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<ShapeRendererConfig> => ({
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
        <KibanaThemeProvider theme$={theme$}>
          <I18nProvider>
            <ShapeComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
          </I18nProvider>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });

export const shapeRendererFactory = (core: CoreSetup) => getShapeRenderer(core.theme.theme$);
