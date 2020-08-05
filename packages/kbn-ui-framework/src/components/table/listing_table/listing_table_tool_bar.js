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
import PropTypes from 'prop-types';

import { KuiToolBar, KuiToolBarSearchBox, KuiToolBarSection } from '../../';

export function KuiListingTableToolBar({ pager, actions, onFilter, filter }) {
  let actionsSection;

  if (actions) {
    actionsSection = <KuiToolBarSection>{actions}</KuiToolBarSection>;
  }

  let pagerSection;

  if (pager) {
    pagerSection = <KuiToolBarSection>{pager}</KuiToolBarSection>;
  }

  return (
    <KuiToolBar>
      <KuiToolBarSearchBox onFilter={onFilter} filter={filter} />
      {actionsSection}
      {pagerSection}
    </KuiToolBar>
  );
}

KuiListingTableToolBar.propTypes = {
  filter: PropTypes.string,
  onFilter: PropTypes.func.isRequired,
  pager: PropTypes.node,
  actions: PropTypes.node,
};
