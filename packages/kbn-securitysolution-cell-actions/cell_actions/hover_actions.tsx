/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFocusTrap, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback } from 'react';
// import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import styled from 'styled-components';
import { HoverActionsPopover } from './hover_actions_popover';
import { ActionItem } from './cell_action_item';
import { CellActionConfig } from '.';
// FIXME can't import plugin from package

export const SHOW_TOP_N_KEYBOARD_SHORTCUT = 't';

// import { useHoverActionItems } from './use_hover_action_items';

export const YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS = (fieldName: string) =>
  i18n.translate(
    'xpack.securitySolution.dragAndDrop.youAreInADialogContainingOptionsScreenReaderOnly',
    {
      values: { fieldName },
      defaultMessage: `You are in a dialog, containing options for field {fieldName}. Press tab to navigate options. Press escape to exit.`,
    }
  );

export const AdditionalContent = styled.div`
  padding: 2px;
`;

AdditionalContent.displayName = 'AdditionalContent';

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
  ({ additionalContent = null, config, children, getActions, actionContext, showTooltip }) => {
    // const [stKeyboardEvent, setStKeyboardEvent] = useState<React.KeyboardEvent>();
    // const [isActive, setIsActive] = useState(false);
    // const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
    // const onOverflowButtonClick = useCallback(() => {
    //   setIsActive((prev) => !prev);
    //   setIsOverflowPopoverOpen(!isOverflowPopoverOpen);
    // }, [isOverflowPopoverOpen, setIsOverflowPopoverOpen]);
    // const handleHoverActionClicked = useCallback(() => {
    //   // if (closeTopN) {
    //   //   closeTopN();
    //   // }

    //   setIsActive(false);
    //   setIsOverflowPopoverOpen(false);
    //   // if (closePopOver) {
    //   //   closePopOver();
    //   // }
    // }, []);

    // const isInit = useRef(true);
    // const defaultFocusedButtonRef = useRef<HTMLButtonElement | null>(null);

    // useEffect(() => {
    //   if (isInit.current && goGetTimelineId != null && scopeId == null) {
    //     isInit.current = false;
    //     goGetTimelineId(true);
    //   }
    // }, [goGetTimelineId, scopeId]);

    // useEffect(() => {
    //   if (ownFocus) {
    //     setTimeout(() => {
    //       defaultFocusedButtonRef.current?.focus();
    //     }, 0);
    //   }
    // }, [ownFocus]);

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

    // const hideFilters = useMemo(
    //   () => (isAlertDetailsView || isEntityAnalyticsPage) && !isTimelineView,
    //   [isTimelineView, isAlertDetailsView, isEntityAnalyticsPage]
    // );

    // const hiddenActionsCount = useMemo(() => {
    //   const hiddenTopNActions = hideTopN ? 1 : 0; // hides the `Top N` button
    //   const hiddenFilterActions = hideFilters ? 2 : 0; // hides both the `Filter In` and `Filter out` buttons

    //   return hiddenTopNActions + hiddenFilterActions;
    // }, [hideFilters, hideTopN]);

    // const Container =
    // applyWidthAndPadding
    //   ? StyledHoverActionsContainerWithPaddingsAndMinWidth
    //   : StyledHoverActionsContainer;

    const getHoverContent = useCallback(() => {
      const actions = getActions();

      return (
        <EuiFocusTrap
        // disabled={isFocusTrapDisabled({
        //   ownFocus,
        //   // showTopN,
        // })}
        >
          <div
          // onKeyDown={onKeyDown}
          // $showOwnFocus={showOwnFocus}
          // $hiddenActionsCount={hiddenActionsCount}
          // $isActive={isActive}
          // className={isActive ? 'hoverActions-active' : ''}
          >
            <EuiScreenReaderOnly>
              <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(config.field)}</p>
            </EuiScreenReaderOnly>

            {additionalContent != null && (
              <AdditionalContent>{additionalContent}</AdditionalContent>
            )}

            {/* {enableOverflowButton && !isCaseView ? overflowActionItems : {allActionItems} */}

            {actions.map((action) => (
              <ActionItem action={action} actionContext={actionContext} showTooltip={showTooltip} />
            ))}
          </div>
        </EuiFocusTrap>
      );
    }, [additionalContent, config.field, getActions, actionContext, showTooltip]);

    return (
      <HoverActionsPopover
        // alwaysShow={isShowingTopN || hoverActionsOwnFocus}
        // closePopOverTrigger={closePopOverTrigger}
        getHoverContent={getHoverContent}
        // onCloseRequested={onCloseRequested}
      >
        <div
          // ref={(e: HTMLDivElement) => {
          // setContainerRef(e);
          // }}
          tabIndex={-1} // not reachable via keyboard navigation
        >
          {children}
        </div>
      </HoverActionsPopover>
    );
  }
);

HoverActions.displayName = 'HoverActions';

// const renderContent = useCallback(
//   () => (
//     <div
//       ref={(e: HTMLDivElement) => {
//         setContainerRef(e);
//       }}
//       tabIndex={-1}
//     >
//       {truncate ? (
//         <TruncatableText data-test-subj="render-truncatable-content">
//           {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
//         </TruncatableText>
//       ) : (
//         <ProviderContentWrapper
//           data-test-subj={`render-content-${dataProvider.queryMatch.field}`}
//         >
//           {render(dataProvider, null, { isDragging: false, isDropAnimating: false })}
//         </ProviderContentWrapper>
//       )}
//     </div>
//   ),
//   [dataProvider, render, setContainerRef, truncate]
// );

// PREVIOUS props
// applyWidthAndPadding?: boolean;
// closeTopN?: () => void;
// closePopOver?: () => void;
// dataProvider?: DataProvider | DataProvider[];
// dataType?: string;
// enableOverflowButton?: boolean;
// fieldType: string;
// isAggregatable: boolean;
// hideAddToTimeline?: boolean;
// hideTopN?: boolean;
// isObjectArray: boolean;
// onFilterAdded?: () => void;
// ownFocus: boolean;
// showOwnFocus?: boolean;
// showTopN: boolean;
// toggleColumn?: (column: ColumnHeaderOptions) => void;
// toggleTopN: () => void;
// values?: string[] | string | null;

// closePopOver,
// closeTopN,
// dataProvider,
// dataType,
// enableOverflowButton = false,
// applyWidthAndPadding = true,
// fieldType,
// isAggregatable,
// goGetTimelineId,
// isObjectArray,
// hideAddToTimeline = false,
// hideTopN = false,
// onFilterAdded,
// ownFocus,
// showOwnFocus = true,
// showTopN,
// scopeId,
// toggleColumn,
// toggleTopN,
// values,

// TODO ADD EXTRA PROPS for a flexible design
// hover: boolean true for screenshots 2 and 3, false (inline) for screenshots 1 and 5
// showMoreActionsFrom?: number set to 3 to have the screenshot 4. It will group actions from that number to the end in a moreActions popover. (We could do this in many different ways, just giving an example)
// customActions?: Action[] for screenshot 6, we could allow the caller to append actions with its own implementation (Action will have to be something like: { icon: string, title: string, execute (data: TBD) => void } )
