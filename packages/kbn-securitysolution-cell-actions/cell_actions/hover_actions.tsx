/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiScreenReaderOnly,
  EuiToolTip,
  EuiWrappingPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { HoverActionsPopover } from './hover_actions_popover';
import { ActionItem } from './cell_action_item';
import { CellActionConfig } from '.';
// FIXME can't import plugin from package

export const SHOW_TOP_N_KEYBOARD_SHORTCUT = 't';

// import { useHoverActionItems } from './use_hover_action_items';

export const YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS = (fieldName: string) =>
  i18n.translate(
    'xpack.securitySolution.cellActions.youAreInADialogContainingOptionsScreenReaderOnly',
    {
      values: { fieldName },
      defaultMessage: `You are in a dialog, containing options for field {fieldName}. Press tab to navigate options. Press escape to exit.`,
    }
  );

export const SHOW_MORE_ACTIONS = i18n.translate(
  'xpack.securitySolution.cellActions.showMoreActionsLabel',
  {
    defaultMessage: 'More actions',
  }
);

export const additionalContentCSS = css`
  padding: 2px;
`;

// const StyledHoverActionsContainer = styled.div<{
//   $showTopN: boolean;
//   $showOwnFocus: boolean;
//   $hiddenActionsCount: number;
//   $isActive: boolean;
// }>`
//   display: flex;

//   ${(props) =>
//     props.$isActive
//       ? `
//     .hoverActions-active {
//       .timelines__hoverActionButton,
//       .securitySolution__hoverActionButton {
//         opacity: 1;
//       }
//     }
//   `
//       : ''}

//   ${(props) =>
//     props.$showOwnFocus
//       ? `
//     &:focus-within {
//       .timelines__hoverActionButton,
//       .securitySolution__hoverActionButton {
//         opacity: 1;
//       }
//     }

//     &:hover {
//       .timelines__hoverActionButton,
//       .securitySolution__hoverActionButton {
//         opacity: 1;
//       }
//     }

//   .timelines__hoverActionButton,
//   .securitySolution__hoverActionButton {
//     opacity: ${props.$showTopN ? 1 : 0};

//       &:focus {
//         opacity: 1;
//       }
//     }
//   `
//       : ''}
// `;

// const StyledHoverActionsContainerWithPaddingsAndMinWidth = styled(StyledHoverActionsContainer)`
//   min-width: ${({ $hiddenActionsCount }) => `${138 - $hiddenActionsCount * 26}px`};
//   padding: ${(props) => `0 ${props.theme.eui.euiSizeS}`};
//   position: relative;
// `;

interface Props {
  additionalContent?: React.ReactNode;
  config: CellActionConfig;
  getActions: () => Action[];
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
  showMoreActionsFrom: number;
}

/** Returns a value for the `disabled` prop of `EuiFocusTrap` */
// const isFocusTrapDisabled = ({
//   ownFocus,
//   showTopN,
// }: {
//   ownFocus: boolean;
//   showTopN: boolean;
// }): boolean => {
//   if (showTopN) {
//     return false; // we *always* want to trap focus when showing Top N
//   }

//   return !ownFocus;
// };

export const stopPropagationAndPreventDefault = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

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
    const [isExtraActionsPopoverOpen, setIsExtraActionsPopoverOpen] = useState(false);
    const closeExtraActions = useCallback(
      () => setIsExtraActionsPopoverOpen(false),
      [setIsExtraActionsPopoverOpen]
    );
    const contentRef = useRef<HTMLDivElement>(null);

    // useEffect(() => {
    //   if (ownFocus) {
    //     setTimeout(() => {
    //       defaultFocusedButtonRef.current?.focus();
    //     }, 0);
    //   }
    // }, [ownFocus]);

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

    // const Container =
    // applyWidthAndPadding
    //   ? StyledHoverActionsContainerWithPaddingsAndMinWidth
    //   : StyledHoverActionsContainer;

    const getExtraActions = useCallback(() => {
      const allActions = getActions();
      return allActions.length > showMoreActionsFrom
        ? allActions.slice(showMoreActionsFrom - 1, allActions.length)
        : [];
    }, [getActions, showMoreActionsFrom]);

    const extraActionsPopover = useMemo(
      () =>
        isExtraActionsPopoverOpen ? (
          <EuiWrappingPopover
            button={contentRef.current!} // ref is not nullable when popover is open
            isOpen={isExtraActionsPopoverOpen}
            closePopover={closeExtraActions}
            panelPaddingSize="s"
            anchorPosition={'downCenter'}
            hasArrow={false}
            repositionOnScroll
            ownFocus
            attachToAnchor={false}
          >
            <EuiScreenReaderOnly>
              <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(config.field)}</p>
            </EuiScreenReaderOnly>
            <EuiContextMenuPanel
              size="s"
              items={getExtraActions().map((action) => (
                <EuiContextMenuItem
                  key={action.id}
                  icon={action.getIconType(actionContext)}
                  aria-label={action.getDisplayName(actionContext)}
                  onClick={() => {
                    closeExtraActions();
                    action.execute(actionContext);
                  }}
                >
                  {action.getDisplayName(actionContext)}
                </EuiContextMenuItem>
              ))}
            />
          </EuiWrappingPopover>
        ) : null,
      [actionContext, closeExtraActions, config.field, getExtraActions, isExtraActionsPopoverOpen]
    );

    const getHoverContent = useCallback(
      (closeHoverPopOver: () => void) => {
        closeExtraActions(); // Make sure extra actions are closed when opening hover actions
        const allActions = getActions();
        const visibleActions =
          allActions.length > showMoreActionsFrom
            ? allActions.slice(0, showMoreActionsFrom - 1)
            : allActions;

        const button = (
          <EuiButtonIcon
            aria-label={SHOW_MORE_ACTIONS}
            iconType="boxesHorizontal"
            onClick={() => {
              setIsExtraActionsPopoverOpen(true);
              closeHoverPopOver();
            }}
          />
        );

        const extraActionsButton = showTooltip ? (
          <EuiToolTip content={SHOW_MORE_ACTIONS}>{button}</EuiToolTip>
        ) : (
          button
        );

        return (
          <div>
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
            {allActions.length > visibleActions.length ? extraActionsButton : null}
          </div>
        );
      },
      [
        closeExtraActions,
        getActions,
        showMoreActionsFrom,
        showTooltip,
        config.field,
        additionalContent,
        actionContext,
      ]
    );
    return (
      <>
        <HoverActionsPopover getHoverContent={getHoverContent}>
          <div ref={contentRef}>{children}</div>
        </HoverActionsPopover>
        {extraActionsPopover}
      </>
    );
  }
);

HoverActions.displayName = 'HoverActions';
