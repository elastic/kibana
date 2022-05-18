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

export const PanelViewWithSharing: React.FC = () => {
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
  ];

  const panels = useAsync(() =>
    buildContextMenuForActions({
      actions: actions.map((action) => ({ action, context, trigger })),
    })
  );

  return (
    <EuiPopover
      button={
        <EuiButton onClick={() => setOpen((x) => !x)}>View mode with few sharing options</EuiButton>
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
