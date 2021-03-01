/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EventEmitter } from 'events';

import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import { IEditorController, EditorRenderProps } from 'src/plugins/visualize/public';
import { getUISettings, getI18n } from '../services';
import { VisEditor } from './components/vis_editor_lazy';

export const TSVB_EDITOR_NAME = 'tsvbEditor';

export class EditorController implements IEditorController {
  constructor(
    private el: HTMLElement,
    private vis: Vis,
    private eventEmitter: EventEmitter,
    private embeddableHandler: VisualizeEmbeddableContract
  ) {}

  render({ timeRange }: EditorRenderProps) {
    const I18nContext = getI18n().Context;

    render(
      <I18nContext>
        <VisEditor
          config={getUISettings()}
          vis={this.vis}
          visParams={this.vis.params}
          timeRange={timeRange}
          embeddableHandler={this.embeddableHandler}
          eventEmitter={this.eventEmitter}
        />
      </I18nContext>,
      this.el
    );
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}
