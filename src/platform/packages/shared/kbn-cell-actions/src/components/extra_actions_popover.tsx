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

type ExtraActionsPopOverWithAnchorProps = Pick<
  ActionsPopOverProps,
  'anchorPosition' | 'actionContext' | 'closePopOver' | 'isOpen' | 'actions' | 'extraActionsColor'
>;

/**
 * Makes the popover root cover its (positioned) parent, so the popover opens relative to the parent's
 * box. The anchor is an empty element that is stacked on top of the content it stands for: the content
 * itself is never moved or re-parented, so it keeps its DOM node, state and focus.
 */
export const OVERLAY_ANCHOR_STYLE = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
} as const;

const OVERLAY_ANCHOR_BUTTON = <span />;

/**
 * Extra actions popover that opens relative to the box of its positioned parent element.
 * Must be rendered inside an element with `position: relative` (or any other positioned element).
 */
export const ExtraActionsPopOverWithAnchor = ({
  anchorPosition,
  actionContext,
  isOpen,
  closePopOver,
  actions,
  extraActionsColor,
}: ExtraActionsPopOverWithAnchorProps) => (
  <EuiPopover
    aria-label={EXTRA_ACTIONS_ARIA_LABEL}
    display="block"
    style={OVERLAY_ANCHOR_STYLE}
    button={OVERLAY_ANCHOR_BUTTON}
    isOpen={isOpen}
    closePopover={closePopOver}
    panelPaddingSize="xs"
    anchorPosition={anchorPosition}
    hasArrow={false}
    repositionOnScroll
    ownFocus
    data-test-subj="extraActionsPopOverWithAnchor"
  >
    <ExtraActionsPopOverContent
      actions={actions}
      actionContext={actionContext}
      closePopOver={closePopOver}
      extraActionsColor={extraActionsColor}
    />
  </EuiPopover>
);

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
      <EuiContextMenuPanel items={items} />
    </>
  );
};
