/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nStart } from 'kibana/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { DataVisualizerPanel } from './data_visualizer_panel';
import { IndexPattern } from '../../../../../../../data/common';
import { SavedSearch } from '../../../../../saved_searches';
import { DiscoverServices } from '../../../../../build_services';
import { GetStateReturn } from '../../services/discover_state';

let isOpen = false;

export function showDataVisualizerPanel({
  I18nContext,
  indexPattern,
  savedSearch,
  services,
  state,
}: {
  I18nContext: I18nStart['Context'];
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
}) {
  if (isOpen) {
    return;
  }

  isOpen = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpen = false;
  };

  document.body.appendChild(container);
  const element = (
    <I18nContext>
      <DataVisualizerPanel
        onClose={onClose}
        indexPattern={indexPattern}
        savedSearch={savedSearch}
        services={services}
        state={state}
      />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
