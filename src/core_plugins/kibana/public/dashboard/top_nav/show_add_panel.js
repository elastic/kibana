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

import { DashboardAddPanel } from './add_panel';
import React from 'react';
import ReactDOM from 'react-dom';

let isOpen = false;

export function showAddPanel(savedObjectsClient, addNewPanel, addNewVis, listingLimit, isLabsEnabled, visTypes) {
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
  const find = async (type, search) => {
    const resp = await savedObjectsClient.find({
      type: type,
      fields: ['title', 'visState'],
      search: search ? `${search}*` : undefined,
      page: 1,
      perPage: listingLimit,
      searchFields: ['title^3', 'description']
    });

    if (type === 'visualization' && !isLabsEnabled) {
      resp.savedObjects = resp.savedObjects.filter(savedObject => {
        const typeName = JSON.parse(savedObject.attributes.visState).type;
        const visType = visTypes.byName[typeName];
        return visType.stage !== 'lab';
      });
    }

    return resp;
  };

  const addNewVisWithCleanup = () => {
    onClose();
    addNewVis();
  };

  document.body.appendChild(container);
  const element = (
    <DashboardAddPanel
      onClose={onClose}
      find={find}
      addNewPanel={addNewPanel}
      addNewVis={addNewVisWithCleanup}
    />
  );
  ReactDOM.render(element, container);
}
