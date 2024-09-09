/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../../../../build_services';
import { OpenSearchPanel } from './open_search_panel';

let isOpen = false;

export function showOpenSearchPanel({
  onOpenSavedSearch,
  services,
}: {
  onOpenSavedSearch: (id: string) => void;
  services: DiscoverServices;
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
    <KibanaRenderContextProvider {...services.core}>
      <KibanaContextProvider services={services}>
        <OpenSearchPanel onClose={onClose} onOpenSavedSearch={onOpenSavedSearch} />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}
