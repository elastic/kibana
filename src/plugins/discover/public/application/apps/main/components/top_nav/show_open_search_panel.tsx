/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { OpenSearchPanel } from './open_search_panel';

let isOpen = false;

export function showOpenSearchPanel({
  I18nContext,
  onOpenSavedSearch,
}: {
  I18nContext: I18nStart['Context'];
  onOpenSavedSearch: (id: string) => void;
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
      <OpenSearchPanel onClose={onClose} onOpenSavedSearch={onOpenSavedSearch} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
