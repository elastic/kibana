/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRoot } from 'react-dom/client';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';

export const buttonRenderer: ExpressionRenderDefinition<any> = {
  name: 'button',
  displayName: 'Button',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const buttonClick = () => {
      handlers.event({
        name: 'NAVIGATE',
        data: {
          href: config.href,
        },
      });
    };

    const renderDebug = () => (
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
    );

    const root = createRoot(domNode);

    root.render(
      renderDebug()

      // () => handlers.done()
    );

    handlers.onDestroy(() => root.unmount());
  },
};
