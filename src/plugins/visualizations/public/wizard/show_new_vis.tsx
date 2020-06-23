/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n/react';
import { NewVisModal } from './new_vis_modal';
import {
  getHttp,
  getSavedObjects,
  getTypes,
  getUISettings,
  getUsageCollector,
  getApplication,
  getEmbeddable,
} from '../services';

export interface ShowNewVisModalParams {
  editorParams?: string[];
  onClose?: () => void;
  originatingApp?: string;
  outsideVisualizeApp?: boolean;
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
      />
    </I18nProvider>
  );
  ReactDOM.render(element, container);

  return () => handleClose();
}
