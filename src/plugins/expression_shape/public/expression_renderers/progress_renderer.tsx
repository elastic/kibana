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
import { CoreTheme } from 'kibana/public';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { CoreSetup } from '../../../../core/public';
import { ProgressRendererConfig } from '../../common/types';
import { LazyProgressComponent } from '../components/progress';
import { withSuspense, defaultTheme$ } from '../../../presentation_util/public';

const ProgressComponent = withSuspense(LazyProgressComponent);

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionShape.renderer.progress.displayName', {
      defaultMessage: 'Progress',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionShape.renderer.progress.helpDescription', {
      defaultMessage: 'Render a basic progress',
    }),
};

export const getProgressRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<ProgressRendererConfig> => ({
    name: 'progress',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: ProgressRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaThemeProvider theme$={theme$}>
          <I18nProvider>
            <ProgressComponent {...config} parentNode={domNode} onLoaded={handlers.done} />
          </I18nProvider>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });

export const progressRendererFactory = (core: CoreSetup) => getProgressRenderer(core.theme.theme$);
