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
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { defaultTheme$ } from '@kbn/presentation-util-plugin/common';
import { JSON } from '../../common';
import { LazyDebugRenderComponent } from '../components';

const Debug = withSuspense(LazyDebugRenderComponent);

const strings = {
  getDisplayName: () =>
    i18n.translate('expressionError.renderer.debug.displayName', {
      defaultMessage: 'Debug',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionError.renderer.debug.helpDescription', {
      defaultMessage: 'Render debug output as formatted {JSON}',
      values: {
        JSON,
      },
    }),
};

export const getDebugRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$) =>
  (): ExpressionRenderDefinition<any> => ({
    name: 'debug',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, config, handlers) {
      handlers.onDestroy(() => unmountComponentAtNode(domNode));
      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider theme={{ theme$ }}>
              <Debug parentNode={domNode} payload={config} onLoaded={handlers.done} />
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode
      );
    },
  });

export const debugRendererFactory = (core: CoreSetup) => getDebugRenderer(core.theme.theme$);
