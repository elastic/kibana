/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';
import { EventEmitter } from 'events';
import React, { lazy, Suspense } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { Reference } from '@kbn/content-management-utils';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  EditorRenderProps,
  EmbeddableApiHandler,
  IEditorController,
  Vis,
} from '@kbn/visualizations-plugin/public';
import { getAnalytics, getI18n, getTheme } from './services';

// @ts-ignore
const DefaultEditor = lazy(() => import('./default_editor'));

class DefaultEditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis,
    private eventEmitter: EventEmitter,
    private embeddableApiHandler: EmbeddableApiHandler,
    private references: Reference[]
  ) {}

  render(props: EditorRenderProps) {
    render(
      <KibanaRenderContextProvider analytics={getAnalytics()} i18n={getI18n()} theme={getTheme()}>
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
              embeddableApiHandler={this.embeddableApiHandler}
              vis={this.vis}
              references={this.references}
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

export const DefaultEditorWrapper: React.FC<EditorRenderProps> = ({
  eventEmitter,
  embeddableApiHandler,
  vis,
  initialState,
  references,
  ...props
}) => {
  return (
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
          eventEmitter={eventEmitter}
          embeddableApiHandler={embeddableApiHandler}
          vis={vis}
          initialState={initialState}
          references={references}
          {...props}
        />
      </Suspense>
    </EuiErrorBoundary>
  );
};

export { DefaultEditorController };
