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
import { buildContextMenuForActions, Action } from '../../../../src/plugins/ui_actions/public';
import { sampleAction } from './util';

export const PanelViewWithSharingLong: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const context = {};
  const trigger: any = 'TEST_TRIGGER';
  const grouping: Action['grouping'] = [
    {
      id: 'sharing',
      getDisplayName: () => 'Sharing',
      getIconType: () => 'share',
      order: 50,
    },
  ];
  const actions = [
    sampleAction('test-1', 100, 'Explore underlying data', 'discoverApp'),
    sampleAction('test-2', 99, 'Customize time range', 'calendar'),
    sampleAction('test-3', 98, 'Inspect', 'inspect'),
    sampleAction('test-4', 97, 'Full screen', 'fullScreen'),
    sampleAction('test-5', 10, 'Copy link', 'link', grouping),
    sampleAction('test-6', 9, 'Copy .png', 'image', grouping),
    sampleAction('test-7', 8, 'Copy .pdf', 'link', grouping),
    sampleAction('test-8', 7, 'Send to slack', 'link', grouping),
    sampleAction('test-9', 6, 'Send by e-mail', 'email', grouping),
  ];

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: actions.map((action) => ({ action, context, trigger })),
    })
  );

  return (
    <EuiPopover
      button={
        <EuiButton onClick={() => setOpen((x) => !x)}>
          View mode with many sharing options
        </EuiButton>
      }
      isOpen={open}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu initialPanelId={'mainMenu'} panels={panels.value} />
    </EuiPopover>
  );
};
