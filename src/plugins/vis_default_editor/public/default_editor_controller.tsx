/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EventEmitter } from 'events';
import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';

import { Vis, VisualizeEmbeddableContract } from '@kbn/visualizations-plugin/public';
import { IEditorController, EditorRenderProps } from '@kbn/visualizations-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { getAnalytics, getI18n, getTheme } from './services';

// @ts-ignore
const DefaultEditor = lazy(() => import('./default_editor'));

class DefaultEditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis,
    private eventEmitter: EventEmitter,
    private embeddableHandler: VisualizeEmbeddableContract
  ) {}

  render(props: EditorRenderProps) {
    render(
      <KibanaRenderContextProvider analytics={getAnalytics()} i18n={getI18n()} theme={getTheme()}>
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <div
                css={{
                  display: 'flex',
                  flex: '1 1 auto',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <EuiLoadingChart size="xl" mono />
              </div>
            }
          >
            <DefaultEditor
              eventEmitter={this.eventEmitter}
              embeddableHandler={this.embeddableHandler}
              vis={this.vis}
              {...props}
            />
          </Suspense>
        </EuiErrorBoundary>
      </KibanaRenderContextProvider>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { DefaultEditorController };
