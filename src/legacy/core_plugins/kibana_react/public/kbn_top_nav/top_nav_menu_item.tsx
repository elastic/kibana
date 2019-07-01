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
import { EuiButtonEmpty } from '@elastic/eui';

import { TopNavMenuData, CloseHandler, TopNavMenuAction } from './top_nav_menu_data';

interface Props {
  data: TopNavMenuData;
  onClick: (key: string, action: TopNavMenuAction, target?: any) => void;
}

interface State {
  isDisabled: boolean;
  closeHandler: CloseHandler;
}

export class TopNavMenuItem extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  private isDisabled(): boolean {
    const menuData = this.props.data;
    const val =
      typeof menuData.disableButton === 'function'
        ? menuData.disableButton()
        : menuData.disableButton;
    return val || false;
  }

  private handleClick() {
    const menuData = this.props.data;
    this.props.onClick(menuData.key, menuData.run, arguments[0].currentTarget);
  }

  public render() {
    const menuData = this.props.data;
    return (
      <EuiButtonEmpty
        size="xs"
        isDisabled={this.isDisabled()}
        onClick={this.handleClick.bind(this)}
      >
        {_.capitalize(menuData.label || menuData.key)}
      </EuiButtonEmpty>
    );
  }
}
