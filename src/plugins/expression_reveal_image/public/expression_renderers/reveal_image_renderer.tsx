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
import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { getRendererStrings } from '../../common/i18n';
import { RendererHandlers } from '../../common/types';
import { RevealImageRendererConfig } from './types';
import { RendererWrapper } from '../components/renderer_wrapper';
import './reveal_image.scss';

const { revealImage: revealImageStrings } = getRendererStrings();

const RevealImageComponent = lazy(() => import('../components/reveal_image_component'));

export const revealImageRenderer = (): ExpressionRenderDefinition<RevealImageRendererConfig> => ({
  name: 'revealImage',
  displayName: revealImageStrings.getDisplayName(),
  help: revealImageStrings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    config: RevealImageRendererConfig,
    handlers: RendererHandlers
  ) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <I18nProvider>
        <RendererWrapper>
          <RevealImageComponent handlers={handlers} {...config} parentNode={domNode} />
        </RendererWrapper>
      </I18nProvider>,
      domNode
    );
  },
});
