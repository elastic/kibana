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

import {
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export default () => (
  <div>
    <KuiFlexGroup gutterSize="none">
      <KuiFlexItem>None</KuiFlexItem>
      <KuiFlexItem>None</KuiFlexItem>
      <KuiFlexItem>None</KuiFlexItem>
      <KuiFlexItem>None</KuiFlexItem>
    </KuiFlexGroup>

    <br/>
    <br/>

    <KuiFlexGroup gutterSize="small">
      <KuiFlexItem>Small</KuiFlexItem>
      <KuiFlexItem>Small</KuiFlexItem>
      <KuiFlexItem>Small</KuiFlexItem>
      <KuiFlexItem>Small</KuiFlexItem>
    </KuiFlexGroup>

    <br/>
    <br/>

    <KuiFlexGroup gutterSize="medium">
      <KuiFlexItem>Medium</KuiFlexItem>
      <KuiFlexItem>Medium</KuiFlexItem>
      <KuiFlexItem>Medium</KuiFlexItem>
      <KuiFlexItem>Medium</KuiFlexItem>
    </KuiFlexGroup>

    <br/>
    <br/>

    <KuiFlexGroup gutterSize="large">
      <KuiFlexItem>Large (default)</KuiFlexItem>
      <KuiFlexItem>Large (default)</KuiFlexItem>
      <KuiFlexItem>Large (default)</KuiFlexItem>
      <KuiFlexItem>Large (default)</KuiFlexItem>
    </KuiFlexGroup>

    <br/>
    <br/>

    <KuiFlexGroup gutterSize="extraLarge">
      <KuiFlexItem>Extra Large</KuiFlexItem>
      <KuiFlexItem>Extra Large</KuiFlexItem>
      <KuiFlexItem>Extra Large</KuiFlexItem>
      <KuiFlexItem>Extra Large</KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
