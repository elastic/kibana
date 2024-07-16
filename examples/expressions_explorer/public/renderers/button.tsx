/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';

export const getButtonRenderer = (core: CoreSetup) => {
  const buttonRenderer: ExpressionRenderDefinition<any> = {
    name: 'button',
    displayName: 'Button',
    reuseDomNode: true,
    async render(domNode, config, handlers) {
      const [startServices] = await core.getStartServices();
      const buttonClick = () => {
        handlers.event({
          name: 'NAVIGATE',
          data: {
            href: config.href,
          },
        });
      };

      const renderDebug = () => (
        <KibanaRenderContextProvider {...startServices}>
          <div
            style={{
              width: domNode.offsetWidth,
              height: domNode.offsetHeight,
            }}
          >
            <EuiButton
              data-test-subj="testExpressionButton"
              onClick={buttonClick}
              style={{ backgroundColor: config.color || 'white' }}
            >
              {config.name}
            </EuiButton>
          </div>
        </KibanaRenderContextProvider>
      );

      ReactDOM.render(renderDebug(), domNode, () => handlers.done());

      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  };

  return buttonRenderer;
};
