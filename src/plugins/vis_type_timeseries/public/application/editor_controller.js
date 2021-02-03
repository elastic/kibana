/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { getUISettings, getI18n } from '../services';
import { VisEditor } from './components/vis_editor_lazy';

export const TSVB_EDITOR_NAME = 'tsvbEditor';

export class EditorController {
  constructor(el, vis, eventEmitter, embeddableHandler) {
    this.el = el;

    this.embeddableHandler = embeddableHandler;
    this.eventEmitter = eventEmitter;

    this.state = {
      vis: vis,
    };
  }

  async render(params) {
    const I18nContext = getI18n().Context;

    render(
      <I18nContext>
        <VisEditor
          config={getUISettings()}
          vis={this.state.vis}
          visParams={this.state.vis.params}
          timeRange={params.timeRange}
          renderComplete={() => {}}
          appState={params.appState}
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
