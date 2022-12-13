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
import React, { useMemo } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import type { Action } from '../../actions';
import { YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import { CellActionExecutionContext } from './cell_actions';

const euiContextMenuItemCSS = css`
  color: ${euiThemeVars.euiColorPrimaryText};
`;

interface ActionsPopOverProps {
  actionContext: CellActionExecutionContext;
  isOpen: boolean;
  closePopOver: () => void;
  actions: Action[];
  button: JSX.Element;
}

export const ExtraActionsPopOver: React.FC<ActionsPopOverProps> = ({
  actions,
  actionContext,
  isOpen,
  closePopOver,
  button,
}) => (
  <EuiPopover
    button={button}
    isOpen={isOpen}
    closePopover={closePopOver}
    panelPaddingSize="xs"
    anchorPosition={'downCenter'}
    hasArrow={true}
    repositionOnScroll
    ownFocus
    data-test-subj="extraActionsPopOver"
  >
    <ExtraActionsPopOverContent
      actions={actions}
      actionContext={actionContext}
      closePopOver={closePopOver}
    />
  </EuiPopover>
);

interface ExtraActionsPopOverWithAnchorProps
  extends Pick<ActionsPopOverProps, 'actionContext' | 'closePopOver' | 'isOpen' | 'actions'> {
  anchorRef: React.RefObject<HTMLElement>;
}

export const ExtraActionsPopOverWithAnchor = ({
  anchorRef,
  actionContext,
  isOpen,
  closePopOver,
  actions,
}: ExtraActionsPopOverWithAnchorProps) => {
  return anchorRef.current ? (
    <EuiWrappingPopover
      button={anchorRef.current}
      isOpen={isOpen}
      closePopover={closePopOver}
      panelPaddingSize="xs"
      anchorPosition={'downCenter'}
      hasArrow={false}
      repositionOnScroll
      ownFocus
      attachToAnchor={false}
      data-test-subj="extraActionsPopOverWithAnchor"
    >
      <ExtraActionsPopOverContent
        actions={actions}
        actionContext={actionContext}
        closePopOver={closePopOver}
      />
    </EuiWrappingPopover>
  ) : null;
};

ExtraActionsPopOverWithAnchor.displayName = 'ExtraActionsPopOverWithAnchor';

type ExtraActionsPopOverContentProps = Pick<
  ActionsPopOverProps,
  'actionContext' | 'closePopOver' | 'actions'
>;

const ExtraActionsPopOverContent: React.FC<ExtraActionsPopOverContentProps> = ({
  actionContext,
  actions,
  closePopOver,
}) => {
  const items = useMemo(
    () =>
      actions.map((action) => (
        <EuiContextMenuItem
          css={euiContextMenuItemCSS}
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
      )),
    [actionContext, actions, closePopOver]
  );
  return (
    <>
      <EuiScreenReaderOnly>
        <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(actionContext.field)}</p>
      </EuiScreenReaderOnly>
      <EuiContextMenuPanel size="s" items={items} />
    </>
  );
};

ExtraActionsPopOverContent.displayName = 'ExtraActionsPopOverContent';
