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
import { RevealImageRendererConfig } from '../../common/types';
import './reveal_image.scss';

const { revealImage: revealImageStrings } = getRendererStrings();

const LazyRevealImageComponent = lazy(() => import('../components/reveal_image_component'));
const RevealImageComponent = withSuspense(LazyRevealImageComponent, null);

export const revealImageRenderer = (): ExpressionRenderDefinition<RevealImageRendererConfig> => ({
  name: 'revealImage',
  displayName: revealImageStrings.getDisplayName(),
  help: revealImageStrings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    config: RevealImageRendererConfig,
    handlers: IInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <RevealImageComponent handlers={handlers} {...config} parentNode={domNode} />
      </I18nProvider>,
      domNode
    );
  },
});
