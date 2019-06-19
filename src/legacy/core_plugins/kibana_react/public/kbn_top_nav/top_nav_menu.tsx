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

import React, { Component } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TopNavMenuData, TopNavMenuItem } from './top_nav_menu_item';

interface Props {
  config: TopNavMenuData[];
  name: string;
  searchBarOptions?: any;
}

interface State {
  isVisible: boolean;
}

export class TopNavMenu extends Component<Props, State> {
  public render() {
    return (
      <EuiFlexGroup data-test-subj="top-nav" justifyContent="flexStart" gutterSize="xs">
        {this.renderItems()}
      </EuiFlexGroup>
    );
  }

  private renderItems() {
    return this.props.config.map((menuItem, i) => (
      <EuiFlexItem grow={false} key={i}>
        <TopNavMenuItem data={menuItem} />
      </EuiFlexItem>
    ));
  }
}
