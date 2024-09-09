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
import { getElasticLogo, defaultTheme$, isValidUrl } from '@kbn/presentation-util-plugin/common';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { ImageRendererConfig } from '../../common/types';

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionImage.renderer.image.displayName', {
      defaultMessage: 'Image',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionImage.renderer.image.helpDescription', {
      defaultMessage: 'Render an image',
    }),
};

export const getImageRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<ImageRendererConfig> => ({
    name: 'image',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: ImageRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { elasticLogo } = await getElasticLogo();
      const dataurl = isValidUrl(config.dataurl ?? '') ? config.dataurl : elasticLogo;

      const style = {
        height: '100%',
        backgroundImage: `url(${dataurl})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: config.mode as string,
      };

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider theme={{ theme$ }}>
              <div style={style} />
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode,
        () => handlers.done()
      );
    },
  });

export const imageRendererFactory = (core: CoreSetup) => getImageRenderer(core.theme.theme$);
