/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { EuiPortal, EuiProgress } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import {
  getHttp,
  getSavedObjects,
  getTypes,
  getUISettings,
  getUsageCollector,
  getApplication,
  getEmbeddable,
  getDocLinks,
} from '../services';

const NewVisModal = lazy(() => import('./new_vis_modal'));

export interface ShowNewVisModalParams {
  editorParams?: string[];
  onClose?: () => void;
  originatingApp?: string;
  outsideVisualizeApp?: boolean;
  createByValue?: boolean;
}

/**
 * shows modal dialog that allows you to create new visualization
 * @param {string[]} editorParams
 * @param {function} onClose - function that will be called when dialog is closed
 */
export function showNewVisModal({
  editorParams = [],
  onClose,
  originatingApp,
  outsideVisualizeApp,
}: ShowNewVisModalParams = {}) {
  const container = document.createElement('div');
  let isClosed = false;
  const handleClose = () => {
    if (isClosed) return;
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    if (onClose) {
      onClose();
    }
    isClosed = true;
  };

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <Suspense
        fallback={
          <EuiPortal>
            <EuiProgress size="xs" position="fixed" />
          </EuiPortal>
        }
      >
        <NewVisModal
          isOpen={true}
          onClose={handleClose}
          originatingApp={originatingApp}
          stateTransfer={getEmbeddable().getStateTransfer()}
          outsideVisualizeApp={outsideVisualizeApp}
          editorParams={editorParams}
          visTypesRegistry={getTypes()}
          addBasePath={getHttp().basePath.prepend}
          uiSettings={getUISettings()}
          savedObjects={getSavedObjects()}
          usageCollection={getUsageCollector()}
          application={getApplication()}
          docLinks={getDocLinks()}
        />
      </Suspense>
    </I18nProvider>
  );
  ReactDOM.render(element, container);

  return () => handleClose();
}
