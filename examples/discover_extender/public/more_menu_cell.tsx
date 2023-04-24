/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiDataGridCellValueElementProps,
  EuiPopover,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';

export const MoreMenuCell = ({ setCellProps }: EuiDataGridCellValueElementProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = () => setIsPopoverOpen((open) => !open);
  const closePopover = () => setIsPopoverOpen(false);

  useEffect(() => {
    setCellProps({
      style: {
        padding: 0,
      },
    });
  }, [setCellProps]);

  return (
    <EuiPopover
      button={<EuiButtonIcon color="text" iconType="boxesHorizontal" onClick={togglePopover} />}
      isOpen={isPopoverOpen}
      anchorPosition="rightCenter"
      panelPaddingSize="none"
      closePopover={closePopover}
    >
      <EuiContextMenu
        size="s"
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [
              {
                name: 'Show host details',
                onClick: () => alert('Show host details clicked'),
              },
              {
                name: 'Create rule',
                onClick: () => alert('Create rule clicked'),
              },
              {
                name: 'Create SLO',
                onClick: () => alert('Create SLO clicked'),
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};
