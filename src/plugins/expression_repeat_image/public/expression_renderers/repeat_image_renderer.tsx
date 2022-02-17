/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { CoreTheme } from 'kibana/public';
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { CoreSetup } from '../../../../core/public';
import {
  defaultTheme$,
  getElasticOutline,
  isValidUrl,
  withSuspense,
} from '../../../presentation_util/public';
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

const LazyRepeatImageComponent = lazy(() => import('../components/repeat_image_component'));
const RepeatImageComponent = withSuspense(LazyRepeatImageComponent, null);

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
        <KibanaThemeProvider theme$={theme$}>
          <I18nProvider>
            <RepeatImageComponent onLoaded={handlers.done} {...settings} parentNode={domNode} />
          </I18nProvider>
        </KibanaThemeProvider>,
        domNode
      );
    },
  });

export const repeatImageRendererFactory = (core: CoreSetup) =>
  getRepeatImageRenderer(core.theme.theme$);
