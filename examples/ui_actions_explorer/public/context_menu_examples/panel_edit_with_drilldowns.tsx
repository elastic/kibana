/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { buildContextMenuForActions, Action } from '@kbn/ui-actions-plugin/public';
import { sampleAction } from './util';

export const PanelEditWithDrilldowns: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const context = {};
  const trigger: any = 'TEST_TRIGGER';
  const grouping: Action['grouping'] = [
    {
      id: 'drilldowns',
      getDisplayName: () => 'Drilldowns',
      getIconType: () => 'popout',
      order: 20,
    },
  ];
  const actions = [
    sampleAction('test-1', 100, 'Edit visualization', 'pencil'),
    sampleAction('test-2', 99, 'Clone panel', 'partial'),
    sampleAction('test-3', 98, 'Edit panel title', 'pencil'),
    sampleAction('test-4', 97, 'Customize time range', 'calendar'),
    sampleAction('test-5', 96, 'Inspect', 'inspect'),
    sampleAction('test-6', 95, 'Full screen', 'fullScreen'),
    sampleAction('test-7', 94, 'Replace panel', 'submodule'),
    sampleAction('test-8', 93, 'Delete from dashboard', 'trash'),

    sampleAction('test-9', 10, 'Create drilldown', 'plusInCircle', grouping),
    sampleAction('test-10', 9, 'Manage drilldowns', 'list', grouping),
  ];

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: actions.map((action) => ({ action, context, trigger })),
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
