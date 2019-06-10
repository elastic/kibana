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
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';

import StatusApp from './status_app';

const STATUS_PAGE_DOM_NODE_ID = 'createStatusPageReact';

export function renderStatusPage(buildNum, buildSha) {
  const node = document.getElementById(STATUS_PAGE_DOM_NODE_ID);

  if (!node) {
    return;
  }

  render(
    <I18nContext>
      <StatusApp
        buildNum={buildNum}
        buildSha={buildSha}
      />
    </I18nContext>,
    node,
  );
}

export function destroyStatusPage() {
  const node = document.getElementById(STATUS_PAGE_DOM_NODE_ID);
  node && unmountComponentAtNode(node);
}
