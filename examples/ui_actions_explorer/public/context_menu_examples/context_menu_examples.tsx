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
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { PanelView } from './panel_view';
import { PanelViewWithSharing } from './panel_view_with_sharing';
import { PanelViewWithSharingLong } from './panel_view_with_sharing_long';
import { PanelEdit } from './panel_edit';
import { PanelEditWithDrilldowns } from './panel_edit_with_drilldowns';
import { PanelEditWithDrilldownsAndContextActions } from './panel_edit_with_drilldowns_and_context_actions';

export const ContextMenuExamples: React.FC = () => {
  return (
    <EuiText>
      <h1>Context menu examples</h1>
      <p>
        Below examples show how context menu panels look with varying number of actions and how the
        actions can be grouped into different panels using <EuiCode>grouping</EuiCode> field.
      </p>

      <EuiFlexGroup>
        <EuiFlexItem>
          <PanelView />
        </EuiFlexItem>
        <EuiFlexItem>
          <PanelViewWithSharing />
        </EuiFlexItem>
        <EuiFlexItem>
          <PanelViewWithSharingLong />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <PanelEdit />
        </EuiFlexItem>
        <EuiFlexItem>
          <PanelEditWithDrilldowns />
        </EuiFlexItem>
        <EuiFlexItem>
          <PanelEditWithDrilldownsAndContextActions />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
