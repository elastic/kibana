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
import type { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import type { IEditorController, EditorRenderProps } from 'src/plugins/visualize/public';

import { getUISettings, getI18n } from '../services';
import { VisEditor } from './components/vis_editor_lazy';
import type { TimeseriesVisParams } from '../types';

export const TSVB_EDITOR_NAME = 'tsvbEditor';

export class EditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis<TimeseriesVisParams>,
    private eventEmitter: EventEmitter,
    private embeddableHandler: VisualizeEmbeddableContract
  ) {}

  render({ timeRange, uiState }: EditorRenderProps) {
    const I18nContext = getI18n().Context;

    render(
      <I18nContext>
        <VisEditor
          config={getUISettings()}
          vis={this.vis}
          timeRange={timeRange}
          embeddableHandler={this.embeddableHandler}
          eventEmitter={this.eventEmitter}
          uiState={uiState}
        />
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
