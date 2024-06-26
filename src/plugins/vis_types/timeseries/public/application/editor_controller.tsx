/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type {
  EditorRenderProps,
  IEditorController,
  Vis,
  EmbeddableApiHandler,
} from '@kbn/visualizations-plugin/public';
import type { EventEmitter } from 'events';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { getCoreStart, getDataViewsStart, getUISettings } from '../services';
import type { TimeseriesVisParams } from '../types';
import { VisEditor } from './components/vis_editor_lazy';

export const TSVB_EDITOR_NAME = 'tsvbEditor';

export class EditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis<TimeseriesVisParams>,
    private eventEmitter: EventEmitter,
    private embeddableApiHandler: EmbeddableApiHandler
  ) {}

  async render({ timeRange, uiState, filters, query }: EditorRenderProps) {
    const defaultIndexPattern = (await getDataViewsStart().getDefault()) || undefined;

    render(
      <KibanaRenderContextProvider {...getCoreStart()}>
        <VisEditor
          config={getUISettings()}
          vis={this.vis}
          timeRange={timeRange}
          eventEmitter={this.eventEmitter}
          uiState={uiState}
          filters={filters}
          query={query}
          defaultIndexPattern={defaultIndexPattern}
          embeddableApiHandler={this.embeddableApiHandler}
        />
      </KibanaRenderContextProvider>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
