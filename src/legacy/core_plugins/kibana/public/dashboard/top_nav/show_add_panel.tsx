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

import { I18nContext } from 'ui/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { DashboardAddPanel } from './add_panel';
import { EmbeddableFactoryRegistry } from '../types';

let isOpen = false;

export function showAddPanel(
  addNewPanel: (id: string, type: string) => void,
  addNewVis: () => void,
  embeddableFactories: EmbeddableFactoryRegistry
) {
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

  const addNewVisWithCleanup = () => {
    onClose();
    addNewVis();
  };

  document.body.appendChild(container);
  const element = (
    <I18nContext>
      <DashboardAddPanel
        onClose={onClose}
        addNewPanel={addNewPanel}
        addNewVis={addNewVisWithCleanup}
        embeddableFactories={embeddableFactories}
      />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
