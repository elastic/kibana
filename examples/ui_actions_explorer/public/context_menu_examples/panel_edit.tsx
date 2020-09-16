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
import { sampleAction } from './util';

export const PanelEdit: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const context = {};
  const trigger: any = 'TEST_TRIGGER';
  const actions = [
    sampleAction('test-1', 100, 'Edit visualization', 'pencil'),
    sampleAction('test-2', 99, 'Clone panel', 'partial'),
    sampleAction('test-3', 98, 'Edit panel title', 'pencil'),
    sampleAction('test-4', 97, 'Customize time range', 'calendar'),
    sampleAction('test-5', 96, 'Inspect', 'inspect'),
    sampleAction('test-6', 95, 'Full screen', 'fullScreen'),
    sampleAction('test-7', 94, 'Replace panel', 'submodule'),
    sampleAction('test-8', 93, 'Delete from dashboard', 'trash'),
  ];

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: actions.map((action) => ({ action, context, trigger })),
    })
  );

  return (
    <EuiPopover
      button={<EuiButton onClick={() => setOpen((x) => !x)}>Edit mode</EuiButton>}
      isOpen={open}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu initialPanelId={'mainMenu'} panels={panels.value} />
    </EuiPopover>
  );
};
