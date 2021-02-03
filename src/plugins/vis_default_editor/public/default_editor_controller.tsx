/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Suspense, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EventEmitter } from 'events';
import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';

import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import { IEditorController, EditorRenderProps } from 'src/plugins/visualize/public';

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
      <EuiErrorBoundary>
        <Suspense
          fallback={
            <div
              style={{
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
      </EuiErrorBoundary>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export { DefaultEditorController };
