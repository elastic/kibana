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
import { EuiErrorBoundary } from '@elastic/eui';
import { CoreTheme } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { defaultTheme$ } from '@kbn/presentation-util-plugin/public';
import { RevealImageRendererConfig } from '../../common/types';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionRevealImage.renderer.revealImage.displayName', {
      defaultMessage: 'Image reveal',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionRevealImage.renderer.revealImage.helpDescription', {
      defaultMessage: 'Reveal a percentage of an image to make a custom gauge-style chart',
    }),
};

export const getRevealImageRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<RevealImageRendererConfig> => ({
    name: 'revealImage',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: RevealImageRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { RevealImageComponent } = await import('../components/reveal_image_component');
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <EuiErrorBoundary>
          <KibanaThemeProvider theme$={theme$}>
            <I18nProvider>
              <RevealImageComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
            </I18nProvider>
          </KibanaThemeProvider>
        </EuiErrorBoundary>,
        domNode
      );
    },
  });

export const revealImageRendererFactory = (core: CoreSetup) =>
  getRevealImageRenderer(core.theme.theme$);
