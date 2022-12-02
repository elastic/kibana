/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { HoverActionsPopover } from './hover_actions_popover';
import { ActionItem } from './cell_action_item';
import { CellActionConfig } from '.';
import { ExtraActionsPopOverWithAnchor } from './extra_actions_popover';
import { partitionActions } from '../hooks/actions';
import { ExtraActionsButton } from './extra_actions_button';
import { YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';

const additionalContentCSS = css`
  padding: 2px;
`;

const hoverContentWrapperCSS = css`
  padding: 0 ${euiThemeVars.euiSizeS};
`;

interface Props {
  additionalContent?: React.ReactNode;
  config: CellActionConfig;
  getActions: () => Promise<Action[]>;
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
  showMoreActionsFrom: number;
}

export const stopPropagationAndPreventDefault = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

// Overwrite Popover default minWidth to avoid displaying empty space
const PANEL_STYLE = { minWidth: `24px` };

export const HoverActions: React.FC<Props> = React.memo(
  ({
    additionalContent = null,
    config,
    children,
    getActions,
    actionContext,
    showTooltip,
    showMoreActionsFrom,
  }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExtraActionsPopoverOpen, setIsExtraActionsPopoverOpen] = useState(false);
    const closeExtraActions = useCallback(
      () => setIsExtraActionsPopoverOpen(false),
      [setIsExtraActionsPopoverOpen]
    );

    // const SHOW_TOP_N_KEYBOARD_SHORTCUT = 't';
    // onKeyDown SHORTCUTS
    //   {showHoverContent ? <div onKeyDown={onKeyDown}>{hoverContent}</div> : null}
    // const onKeyDown = useCallback(
    //   (keyboardEvent: React.KeyboardEvent) => {
    //     if (!ownFocus) {
    //       return;
    //     }
    //     switch (keyboardEvent.key) {
    //       case SHOW_TOP_N_KEYBOARD_SHORTCUT:
    //         stopPropagationAndPreventDefault(keyboardEvent);
    //         // toggleTopN();
    //         break;
    //       case 'Enter':
    //         break;
    //       case 'Escape':
    //         stopPropagationAndPreventDefault(keyboardEvent);
    //         break;
    //       default:
    //         // setStKeyboardEvent(keyboardEvent);
    //         break;
    //     }
    //   },
    //   [ownFocus]
    // );

    // TODO to move getHoverContent to inside hover_actions_popover and check if code looks cleaner
    const getHoverContent = useCallback(
      async (closeHoverPopOver: () => void) => {
        closeExtraActions(); // Closed extra actions when opening hover actions

        const actions = await getActions();
        const { visibleActions, extraActions } = partitionActions(actions, showMoreActionsFrom);
        const onShowExtraActionsClick = () => {
          setIsExtraActionsPopoverOpen(true);
          closeHoverPopOver();
        };
        return (
          <div css={hoverContentWrapperCSS}>
            <EuiScreenReaderOnly>
              <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(config.field)}</p>
            </EuiScreenReaderOnly>
            {additionalContent != null && <div css={additionalContentCSS}>{additionalContent}</div>}
            {visibleActions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                actionContext={actionContext}
                showTooltip={showTooltip}
              />
            ))}
            {extraActions.length > 0 ? (
              <ExtraActionsButton onClick={onShowExtraActionsClick} showTooltip={showTooltip} />
            ) : null}
          </div>
        );
      },
      [
        closeExtraActions,
        getActions,
        showMoreActionsFrom,
        config.field,
        additionalContent,
        showTooltip,
        actionContext,
      ]
    );

    return (
      <>
        <HoverActionsPopover getHoverContent={getHoverContent} panelStyle={PANEL_STYLE}>
          <div ref={contentRef}>{children}</div>
        </HoverActionsPopover>
        <ExtraActionsPopOverWithAnchor
          showMoreActionsFrom={showMoreActionsFrom}
          getActions={getActions}
          anchorRef={contentRef}
          actionContext={actionContext}
          config={config}
          closePopOver={closeExtraActions}
          isOpen={isExtraActionsPopoverOpen}
        />
      </>
    );
  }
);

HoverActions.displayName = 'HoverActions';
