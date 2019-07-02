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

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { TopNavMenuData, TopNavMenuAction } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

interface Props {
  config: TopNavMenuData[];
  name: string;
  showBorder?: boolean;
  searchBarOptions?: any;
  activeItem: string;
}

export function TopNavMenu(props: Props) {
  function renderItems() {
    return props.config.map((menuItem, i) => (
      <EuiFlexItem grow={false} key={i}>
        <TopNavMenuItem data={menuItem} onClick={menuItemClickHandler} />
      </EuiFlexItem>
    ));
  }

  function getBorder() {
    if (!props.showBorder) return;
    return <EuiHorizontalRule margin="none" />;
  }

  function menuItemClickHandler(key: string, action: TopNavMenuAction, target?: any) {
    action(null, null, target);
  }

  return (
    <div>
      <EuiFlexGroup data-test-subj="top-nav" justifyContent="flexStart" gutterSize="xs">
        {renderItems()}
      </EuiFlexGroup>
      {getBorder()}
    </div>
  );
}
