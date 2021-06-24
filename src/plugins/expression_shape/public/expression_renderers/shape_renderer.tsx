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
import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { withSuspense } from '../../../presentation_util/public';
import { getRendererStrings } from '../../common/i18n';
import { ShapeRendererConfig } from '../../common/types';

const { shape: shapeStrings } = getRendererStrings();

const LazyShapeComponent = lazy(() => import('../components/shape_component'));
const ShapeComponent = withSuspense(LazyShapeComponent, null);

export const shapeRenderer = (): ExpressionRenderDefinition<ShapeRendererConfig> => ({
  name: 'shape',
  displayName: shapeStrings.getDisplayName(),
  help: shapeStrings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    config: ShapeRendererConfig,
    handlers: IInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <ShapeComponent handlers={handlers} {...config} parentNode={domNode} />
      </I18nProvider>,
      domNode
    );
  },
});
