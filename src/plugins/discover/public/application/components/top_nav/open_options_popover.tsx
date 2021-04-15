/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import './open_options_popover.scss';

let isOpen = false;

const OptionsPopoverLazy = lazy(() => import('./options_popover'));

export function openOptionsPopover({
  I18nContext,
  anchorElement,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
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
      <Suspense fallback={<EuiLoadingSpinner />}>
        <OptionsPopoverLazy onClose={onClose} anchorElement={anchorElement} />
      </Suspense>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
