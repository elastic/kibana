/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenuItem, EuiContextMenuPanel, EuiWrappingPopover } from '@elastic/eui';
import React from 'react';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { CellActionConfig } from '.';
import { PartitionedActions } from '../hooks/actions';

export const ExtraActionsPopOver = ({
  getPartitionedActions,
  showMoreActionsFrom,
  anchorRef,
  actionContext,
  config,
  isOpen,
  closePopOver,
}: {
  showMoreActionsFrom: number;
  anchorRef: React.RefObject<HTMLDivElement>;
  actionContext: ActionExecutionContext;
  config: CellActionConfig;
  isOpen: boolean;
  closePopOver: () => void;
  getPartitionedActions: () => PartitionedActions;
}) => {
  // TODO memoize getActions call to improve performance
  const { extraActions } = getPartitionedActions();
  return isOpen && anchorRef.current ? (
    <EuiWrappingPopover
      button={anchorRef.current}
      isOpen={isOpen}
      closePopover={closePopOver}
      panelPaddingSize="s"
      anchorPosition={'downCenter'}
      hasArrow={false}
      repositionOnScroll
      ownFocus
      attachToAnchor={false}
    >
      {/* <EuiScreenReaderOnly> */}
      {/* <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(config.field)}</p> */}
      {/* </EuiScreenReaderOnly> */}
      <EuiContextMenuPanel
        size="s"
        items={extraActions.map((action) => (
          <EuiContextMenuItem
            key={action.id}
            icon={action.getIconType(actionContext)}
            aria-label={action.getDisplayName(actionContext)}
            onClick={() => {
              closePopOver();
              action.execute(actionContext);
            }}
          >
            {action.getDisplayName(actionContext)}
          </EuiContextMenuItem>
        ))}
      />
    </EuiWrappingPopover>
  ) : null;
};
