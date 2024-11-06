/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';

import { CoreSetup, CoreTheme } from '@kbn/core/public';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { defaultTheme$ } from '@kbn/presentation-util-plugin/common';
import { ShapeRendererConfig } from '../../common/types';

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
      const { ShapeComponent } = await import('../components/shape');
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider theme={{ theme$ }}>
              <I18nProvider>
                <ShapeComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
              </I18nProvider>
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,

        domNode
      );
    },
  });

export const shapeRendererFactory = (core: CoreSetup) => getShapeRenderer(core.theme.theme$);
