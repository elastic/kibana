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
import { CreateIndexPatternWizard } from './create_index_pattern_wizard';

import { I18nContext } from 'ui/i18n';

const CREATE_INDEX_PATTERN_DOM_ELEMENT_ID = 'createIndexPatternReact';

export function renderCreateIndexPatternWizard(initialQuery, services) {
  const node = document.getElementById(CREATE_INDEX_PATTERN_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <I18nContext>
      <CreateIndexPatternWizard initialQuery={initialQuery} services={services} />
    </I18nContext>,
    node
  );
}

export function destroyCreateIndexPatternWizard() {
  const node = document.getElementById(CREATE_INDEX_PATTERN_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
