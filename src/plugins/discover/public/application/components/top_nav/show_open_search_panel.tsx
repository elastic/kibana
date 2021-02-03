/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { OpenSearchPanel } from './open_search_panel';

let isOpen = false;

export function showOpenSearchPanel({
  makeUrl,
  I18nContext,
}: {
  makeUrl: (path: string) => string;
  I18nContext: I18nStart['Context'];
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
      <OpenSearchPanel onClose={onClose} makeUrl={makeUrl} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
