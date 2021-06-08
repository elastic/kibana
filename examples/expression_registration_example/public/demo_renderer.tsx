/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ExpressionRenderDefinition } from '../../../src/plugins/expressions/public';
import { RendererStrings } from '../common';
import { DemoRenderValue } from './expression_functions/demo_function';

interface Props {
  text: string;
  color: string;
}

export const DemoComponent: FC<Props> = ({ text, color }) => (
  <div style={{ color }}>
    {RendererStrings.getLabelText()}: {text}
  </div>
);

export const DemoRenderer: ExpressionRenderDefinition<DemoRenderValue> = {
  name: 'demo',
  displayName: 'demo renderer',
  reuseDomNode: true,
  render: async (domNode, { text, color }, handlers) => {
    handlers.onDestroy(() => unmountComponentAtNode(domNode));

    render(<DemoComponent text={text} color={color} />, domNode);

    handlers.done();
  },
};
