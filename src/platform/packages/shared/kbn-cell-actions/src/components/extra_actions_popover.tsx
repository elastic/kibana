/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiWrappingPopover,
  type EuiButtonIconProps,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { EXTRA_ACTIONS_ARIA_LABEL, YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import type { CellAction, CellActionExecutionContext } from '../types';

const getEuiContextMenuItemCSS = (extraActionsColor?: EuiButtonIconProps['color']) => {
  if (extraActionsColor && extraActionsColor === 'text') {
    return undefined;
  }
  return css`
    color: ${euiThemeVars.euiColorPrimaryText};
  `;
};

interface ActionsPopOverProps {
  anchorPosition: 'rightCenter' | 'downCenter';
  actionContext: CellActionExecutionContext;
  isOpen: boolean;
  closePopOver: () => void;
  actions: CellAction[];
  button: JSX.Element;
  extraActionsColor?: EuiButtonIconProps['color'];
}

export const ExtraActionsPopOver: React.FC<ActionsPopOverProps> = ({
  anchorPosition,
  actions,
  actionContext,
  isOpen,
  closePopOver,
  button,
  extraActionsColor,
}) => (
  <EuiPopover
    button={button}
    isOpen={isOpen}
    closePopover={closePopOver}
    panelPaddingSize="xs"
    anchorPosition={anchorPosition}
    hasArrow
    repositionOnScroll
    ownFocus
    data-test-subj="extraActionsPopOver"
    aria-label={EXTRA_ACTIONS_ARIA_LABEL}
  >
    <ExtraActionsPopOverContent
      actions={actions}
      actionContext={actionContext}
      closePopOver={closePopOver}
      extraActionsColor={extraActionsColor}
    />
  </EuiPopover>
);

interface ExtraActionsPopOverWithAnchorProps
  extends Pick<
    ActionsPopOverProps,
    'anchorPosition' | 'actionContext' | 'closePopOver' | 'isOpen' | 'actions' | 'extraActionsColor'
  > {
  anchorRef: React.RefObject<HTMLElement>;
}

export const ExtraActionsPopOverWithAnchor = ({
  anchorPosition,
  anchorRef,
  actionContext,
  isOpen,
  closePopOver,
  actions,
  extraActionsColor,
}: ExtraActionsPopOverWithAnchorProps) => {
  return anchorRef.current ? (
    <EuiWrappingPopover
      aria-label={EXTRA_ACTIONS_ARIA_LABEL}
      button={anchorRef.current}
      isOpen={isOpen}
      closePopover={closePopOver}
      panelPaddingSize="xs"
      anchorPosition={anchorPosition}
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
        extraActionsColor={extraActionsColor}
      />
    </EuiWrappingPopover>
  ) : null;
};

type ExtraActionsPopOverContentProps = Pick<
  ActionsPopOverProps,
  'actionContext' | 'closePopOver' | 'actions' | 'extraActionsColor'
>;

const ExtraActionsPopOverContent: React.FC<ExtraActionsPopOverContentProps> = ({
  actionContext,
  actions,
  closePopOver,
  extraActionsColor,
}) => {
  const items = useMemo(
    () =>
      actions.map((action) => (
        <EuiContextMenuItem
          css={getEuiContextMenuItemCSS(extraActionsColor)}
          key={action.id}
          icon={action.getIconType(actionContext)}
          aria-label={action.getDisplayName(actionContext)}
          data-test-subj={`actionItem-${action.id}`}
          onClick={() => {
            closePopOver();
            action.execute(actionContext);
          }}
        >
          {action.getDisplayName(actionContext)}
        </EuiContextMenuItem>
      )),
    [actionContext, actions, closePopOver, extraActionsColor]
  );

  return (
    <>
      <EuiScreenReaderOnly>
        <p>
          {YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(
            actionContext.data.map(({ field }) => field.name).join(', ')
          )}
        </p>
      </EuiScreenReaderOnly>
      <EuiContextMenuPanel size="s" items={items} />
    </>
  );
};
