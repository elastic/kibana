/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { ExpressionRenderDefinition } from '../../../../src/plugins/expressions/common/expression_renderers';

export const buttonRenderer: ExpressionRenderDefinition<any> = {
  name: 'button',
  displayName: 'Button',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const buttonClick = () => {
      handlers.event({
        id: 'NAVIGATE',
        value: {
          href: config.href,
        },
      });
    };

    const renderDebug = () => (
      <div style={{ width: domNode.offsetWidth, height: domNode.offsetHeight }}>
        <EuiButton data-test-subj="testExpressionButton" onClick={buttonClick}>
          {config.name}
        </EuiButton>
      </div>
    );

    ReactDOM.render(renderDebug(), domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
};
