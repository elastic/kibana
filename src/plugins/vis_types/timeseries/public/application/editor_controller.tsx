/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { EventEmitter } from 'events';
import type {
  Vis,
  VisualizeEmbeddableContract,
  IEditorController,
  EditorRenderProps,
} from 'src/plugins/visualizations/public';
import { getUISettings, getI18n, getCoreStart, getDataStart } from '../services';
import { VisEditor } from './components/vis_editor_lazy';
import type { TimeseriesVisParams } from '../types';
import { KibanaThemeProvider } from '../../../../../../src/plugins/kibana_react/public';

export const TSVB_EDITOR_NAME = 'tsvbEditor';

export class EditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis<TimeseriesVisParams>,
    private eventEmitter: EventEmitter,
    private embeddableHandler: VisualizeEmbeddableContract
  ) {}

  async render({ timeRange, uiState, filters, query }: EditorRenderProps) {
    const I18nContext = getI18n().Context;
    const defaultIndexPattern = (await getDataStart().dataViews.getDefault()) || undefined;

    render(
      <I18nContext>
        <KibanaThemeProvider theme$={getCoreStart().theme.theme$}>
          <VisEditor
            config={getUISettings()}
            vis={this.vis}
            timeRange={timeRange}
            embeddableHandler={this.embeddableHandler}
            eventEmitter={this.eventEmitter}
            uiState={uiState}
            filters={filters}
            query={query}
            defaultIndexPattern={defaultIndexPattern}
          />
        </KibanaThemeProvider>
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
