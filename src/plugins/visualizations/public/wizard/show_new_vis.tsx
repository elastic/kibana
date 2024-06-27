/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiPortal, EuiProgress } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  getHttp,
  getTypes,
  getApplication,
  getEmbeddable,
  getDocLinks,
  getAnalytics,
  getI18n,
  getTheme,
  getContentManagement,
  getUISettings,
} from '../services';
import type { BaseVisType } from '../vis_types';

const NewVisModal = lazy(() => import('./new_vis_modal'));

export interface ShowNewVisModalParams {
  editorParams?: string[];
  onClose?: () => void;
  originatingApp?: string;
  outsideVisualizeApp?: boolean;
  createByValue?: boolean;
  showAggsSelection?: boolean;
  selectedVisType?: BaseVisType;
}

/**
 * shows modal dialog that allows you to create new visualization
 * @param {string[]} editorParams
 * @param {Function} onClose - function that will be called when dialog is closed
 */
export function showNewVisModal({
  editorParams = [],
  onClose,
  originatingApp,
  outsideVisualizeApp,
  showAggsSelection,
  selectedVisType,
}: ShowNewVisModalParams = {}) {
  const container = document.createElement('div');

  let isClosed = false;

  // initialize variable that will hold reference for unmount
  // eslint-disable-next-line prefer-const
  let unmount: ReturnType<ReturnType<typeof toMountPoint>>;

  const handleClose = () => {
    if (isClosed) return;

    onClose?.();
    unmount?.();
    isClosed = true;
  };

  const mount = toMountPoint(
    React.createElement(function () {
      return (
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
            contentClient={getContentManagement().client}
            uiSettings={getUISettings()}
            addBasePath={getHttp().basePath.prepend}
            application={getApplication()}
            docLinks={getDocLinks()}
            showAggsSelection={showAggsSelection}
            selectedVisType={selectedVisType}
          />
        </Suspense>
      );
    }),
    { analytics: getAnalytics(), i18n: getI18n(), theme: getTheme() }
  );

  unmount = mount(container);

  return () => handleClose();
}
