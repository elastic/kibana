/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Suspense, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EventEmitter } from 'events';
import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';

import { EditorRenderProps, IEditorController } from 'src/plugins/visualize/public';
import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';

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
