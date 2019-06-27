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

import {
  // @ts-ignore
  EuiHeaderSectionItem,
} from '@elastic/eui';

import { HeaderExtension } from './header_extension';
import { ChromeNavControl } from '../../nav_controls';

interface Props {
  navControls: ReadonlyArray<ChromeNavControl>;
  side: 'left' | 'right';
}

export class HeaderNavControls extends Component<Props> {
  public render() {
    const { navControls } = this.props;

    if (!navControls) {
      return null;
    }

    return navControls.map(this.renderNavControl);
  }

  // It should be performant to use the index as the key since these are unlikely
  // to change while Kibana is running.
  private renderNavControl = (navControl: ChromeNavControl, index: number) => (
    <EuiHeaderSectionItem key={index} border={this.props.side === 'left' ? 'right' : 'left'}>
      <HeaderExtension extension={navControl.mount} />
    </EuiHeaderSectionItem>
  );
}
