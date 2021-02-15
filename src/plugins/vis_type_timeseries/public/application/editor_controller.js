/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { fetchIndexPatternFields } from './lib/fetch_fields';
import { getSavedObjectsClient, getUISettings, getI18n } from '../services';
import { VisEditor } from './components/vis_editor_lazy';

export class EditorController {
  constructor(el, vis, eventEmitter, embeddableHandler) {
    this.el = el;

    this.embeddableHandler = embeddableHandler;
    this.eventEmitter = eventEmitter;

    this.state = {
      fields: [],
      vis: vis,
      isLoaded: false,
    };
  }

  fetchDefaultIndexPattern = async () => {
    const indexPattern = await getSavedObjectsClient().client.get(
      'index-pattern',
      getUISettings().get('defaultIndex')
    );

    return indexPattern.attributes;
  };

  fetchDefaultParams = async () => {
    const { title, timeFieldName } = await this.fetchDefaultIndexPattern();

    this.state.vis.params.default_index_pattern = title;
    this.state.vis.params.default_timefield = timeFieldName;
    this.state.fields = await fetchIndexPatternFields(this.state.vis);

    this.state.isLoaded = true;
  };

  async render(params) {
    const I18nContext = getI18n().Context;

    !this.state.isLoaded && (await this.fetchDefaultParams());

    render(
      <I18nContext>
        <VisEditor
          config={getUISettings()}
          vis={this.state.vis}
          visFields={this.state.fields}
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
