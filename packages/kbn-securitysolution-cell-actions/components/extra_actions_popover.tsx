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
import { YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import { usePartitionActions } from '../hooks/actions';

interface ActionsPopOverProps {
  anchorRef: React.RefObject<HTMLElement>;
  actionContext: ActionExecutionContext;
  config: CellActionConfig;
  isOpen: boolean;
  closePopOver: () => void;
  actions: Action[];
  button: JSX.Element;
}

export const ExtraActionsPopOver: React.FC<ActionsPopOverProps> = ({
  actions,
  actionContext,
  config,
  isOpen,
  closePopOver,
  button,
}) => (
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
      actions={actions}
      actionContext={actionContext}
      closePopOver={closePopOver}
      config={config}
    />
  </EuiPopover>
);

interface ExtraActionsPopOverWithAnchorProps
  extends Pick<ActionsPopOverProps, 'actionContext' | 'closePopOver' | 'config' | 'isOpen'> {
  getActions: () => Promise<Action[]>;
  anchorRef: React.RefObject<HTMLElement>;
  showMoreActionsFrom: number;
}

export const ExtraActionsPopOverWithAnchor = ({
  anchorRef,
  actionContext,
  config,
  isOpen,
  closePopOver,
  getActions,
  showMoreActionsFrom,
}: ExtraActionsPopOverWithAnchorProps) => {
  const { extraActions } = usePartitionActions(getActions, showMoreActionsFrom);
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
