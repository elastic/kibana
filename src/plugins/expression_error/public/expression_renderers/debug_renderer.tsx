/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render, unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { Observable } from 'rxjs';
import { CoreTheme } from 'kibana/public';
import { ExpressionRenderDefinition } from 'src/plugins/expressions/common';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '../../../../core/public';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { withSuspense, defaultTheme$ } from '../../../../../src/plugins/presentation_util/public';
import { LazyDebugRenderComponent } from '../components';
import { JSON } from '../../common';

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
        <KibanaThemeProvider theme$={theme$}>
          <Debug parentNode={domNode} payload={config} onLoaded={handlers.done} />
        </KibanaThemeProvider>,
        domNode
      );
    },
  });

export const debugRendererFactory = (core: CoreSetup) => getDebugRenderer(core.theme.theme$);
