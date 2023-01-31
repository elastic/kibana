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
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { CoreSetup } from '@kbn/core/public';
import { defaultTheme$, getElasticOutline, isValidUrl } from '@kbn/presentation-util-plugin/common';
import { RepeatImageRendererConfig } from '../../common/types';

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionRepeatImage.renderer.repeatImage.displayName', {
      defaultMessage: 'RepeatImage',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionRepeatImage.renderer.repeatImage.helpDescription', {
      defaultMessage: 'Render a basic repeatImage',
    }),
};

export const getRepeatImageRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<RepeatImageRendererConfig> => ({
    name: 'repeatImage',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: RepeatImageRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { RepeatImageComponent } = await import('../components/repeat_image_component');
      const { elasticOutline } = await getElasticOutline();
      const settings = {
        ...config,
        image: isValidUrl(config.image) ? config.image : elasticOutline,
        emptyImage: config.emptyImage || '',
      };

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <EuiErrorBoundary>
          <KibanaThemeProvider theme$={theme$}>
            <I18nProvider>
              <RepeatImageComponent onLoaded={handlers.done} {...settings} parentNode={domNode} />
            </I18nProvider>
          </KibanaThemeProvider>
        </EuiErrorBoundary>,
        domNode
      );
    },
  });

export const repeatImageRendererFactory = (core: CoreSetup) =>
  getRepeatImageRenderer(core.theme.theme$);
