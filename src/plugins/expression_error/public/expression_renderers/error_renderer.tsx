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
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { withSuspense } from '../../../presentation_util/public';
import { ErrorRendererConfig } from '../../common/types';

const errorStrings = {
  getDisplayName: () =>
    i18n.translate('expressionError.renderer.error.displayName', {
      defaultMessage: 'Error information',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionError.renderer.error.helpDescription', {
      defaultMessage: 'Render error data in a way that is helpful to users',
    }),
};

const LazyErrorComponent = lazy(() => import('../components/error_component'));
const ErrorComponent = withSuspense(LazyErrorComponent);

export const errorRenderer = (): ExpressionRenderDefinition<ErrorRendererConfig> => ({
  name: 'error',
  displayName: errorStrings.getDisplayName(),
  help: errorStrings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    config: ErrorRendererConfig,
    handlers: IInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <ErrorComponent handlers={handlers} {...config} parentNode={domNode} />
      </I18nProvider>,
      domNode
    );
  },
});
