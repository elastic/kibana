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

import * as React from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { buildContextMenuForActions } from '../../../../src/plugins/ui_actions/public';

export const PanelEditWithDrilldowns: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const context = {};
  const trigger: any = 'TEST_TRIGGER';

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: [
        {
          action: {
            id: 'test-1',
            type: 'test-1' as any,
            order: 100,
            getDisplayName: () => 'Edit visualization',
            getIconType: () => 'pencil',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-2',
            type: 'test-2' as any,
            order: 99,
            getDisplayName: () => 'Clone panel',
            getIconType: () => 'partial',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-3',
            type: 'test-3' as any,
            order: 98,
            getDisplayName: () => 'Edit panel title',
            getIconType: () => 'pencil',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-4',
            type: 'test-4' as any,
            order: 97,
            getDisplayName: () => 'Customize time range',
            getIconType: () => 'calendar',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-5',
            type: 'test-5' as any,
            order: 96,
            getDisplayName: () => 'Inspect',
            getIconType: () => 'inspect',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-6',
            type: 'test-6' as any,
            order: 95,
            getDisplayName: () => 'Full screen',
            getIconType: () => 'fullScreen',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-7',
            type: 'test-7' as any,
            order: 94,
            getDisplayName: () => 'Replace panel',
            getIconType: () => 'submodule',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-8',
            type: 'test-8' as any,
            order: 93,
            getDisplayName: () => 'Delete from dashboard',
            getIconType: () => 'trash',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-9',
            type: 'test-9' as any,
            order: 10,
            grouping: [
              {
                id: 'drilldowns',
                getDisplayName: () => 'Drilldowns',
                getIconType: () => 'popout',
                order: 20,
              },
            ],
            getDisplayName: () => 'Create drilldown',
            getIconType: () => 'plusInCircle',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
        {
          action: {
            id: 'test-10',
            type: 'test-10' as any,
            order: 9,
            grouping: [
              {
                id: 'drilldowns',
                getDisplayName: () => 'Drilldowns',
                getIconType: () => 'popout',
                order: 20,
              },
            ],
            getDisplayName: () => 'Manage drilldowns',
            getIconType: () => 'list',
            isCompatible: async () => true,
            execute: async () => {},
          },
          context,
          trigger,
        },
      ],
      closeMenu: () => {},
    })
  );

  return (
    <EuiPopover
      button={<EuiButton onClick={() => setOpen((x) => !x)}>Edit mode with drilldowns</EuiButton>}
      isOpen={open}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu initialPanelId={'mainMenu'} panels={panels.value} />
    </EuiPopover>
  );
};
