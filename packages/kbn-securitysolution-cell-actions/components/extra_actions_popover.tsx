/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiWrappingPopover,
} from '@elastic/eui';
import React from 'react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { CellActionConfig } from '.';
import { PartitionedActions } from '../hooks/actions';
import { YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';

interface ActionsPopOverProps {
  anchorRef: React.RefObject<HTMLElement>;
  actionContext: ActionExecutionContext;
  config: CellActionConfig;
  isOpen: boolean;
  closePopOver: () => void;
  getPartitionedActions: () => PartitionedActions;
  button: JSX.Element;
}

export const ExtraActionsPopOver: React.FC<ActionsPopOverProps> = ({
  getPartitionedActions,
  actionContext,
  config,
  isOpen,
  closePopOver,
  button,
}) => {
  // TODO memoize getActions call to improve performance
  const { extraActions } = getPartitionedActions();
  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopOver}
      panelPaddingSize="s"
      anchorPosition={'downCenter'}
      hasArrow={true}
      repositionOnScroll
      ownFocus
    >
      <ExtraActionsPopOverContent
        actions={extraActions}
        actionContext={actionContext}
        closePopOver={closePopOver}
        config={config}
      />
    </EuiPopover>
  );
};

interface ExtraActionsPopOverWithAnchorProps
  extends Pick<
    ActionsPopOverProps,
    'actionContext' | 'closePopOver' | 'config' | 'isOpen' | 'getPartitionedActions'
  > {
  anchorRef: React.RefObject<HTMLElement>;
}

export const ExtraActionsPopOverWithAnchor = ({
  getPartitionedActions,
  anchorRef,
  actionContext,
  config,
  isOpen,
  closePopOver,
}: ExtraActionsPopOverWithAnchorProps) => {
  // TODO memoize getActions call to improve performance
  const { extraActions } = getPartitionedActions();
  return anchorRef.current ? (
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
      <ExtraActionsPopOverContent
        actions={extraActions}
        actionContext={actionContext}
        closePopOver={closePopOver}
        config={config}
      />
    </EuiWrappingPopover>
  ) : null;
};

ExtraActionsPopOverWithAnchor.displayName = 'ExtraActionsPopOverWithAnchor';

interface ExtraActionsPopOverContentProps
  extends Pick<ActionsPopOverProps, 'actionContext' | 'closePopOver' | 'config'> {
  actions: Action[];
}

const ExtraActionsPopOverContent: React.FC<ExtraActionsPopOverContentProps> = ({
  actionContext,
  actions,
  closePopOver,
  config,
}) => (
  <>
    <EuiScreenReaderOnly>
      <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(config.field)}</p>
    </EuiScreenReaderOnly>
    <EuiContextMenuPanel
      size="s"
      items={actions.map((action) => (
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
  </>
);

ExtraActionsPopOverContent.displayName = 'ExtraActionsPopOverContent';
