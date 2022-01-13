/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreTheme, I18nStart } from 'kibana/public';
import { Observable } from 'rxjs';
import { OpenSearchPanel } from './open_search_panel';
import { KibanaThemeProvider } from '../../../../../../kibana_react/public';

let isOpen = false;

export function showOpenSearchPanel({
  I18nContext,
  onOpenSavedSearch,
  theme$,
}: {
  I18nContext: I18nStart['Context'];
  onOpenSavedSearch: (id: string) => void;
  theme$: Observable<CoreTheme>;
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
      <KibanaThemeProvider theme$={theme$}>
        <OpenSearchPanel onClose={onClose} onOpenSavedSearch={onOpenSavedSearch} />
      </KibanaThemeProvider>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
