/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
