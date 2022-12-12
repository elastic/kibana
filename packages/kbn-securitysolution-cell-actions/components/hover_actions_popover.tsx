/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPopover, EuiScreenReaderOnly } from '@elastic/eui';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { ActionItem } from './cell_action_item';
import { ExtraActionsButton } from './extra_actions_button';
import { YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import { partitionActions } from '../hooks/actions';
import { ExtraActionsPopOverWithAnchor } from './extra_actions_popover';
import { CellActionExecutionContext } from '.';

/** This class is added to the document body while dragging */
export const IS_DRAGGING_CLASS_NAME = 'is-dragging';

// Overwrite Popover default minWidth to avoid displaying empty space
const PANEL_STYLE = { minWidth: `24px` };

const hoverContentWrapperCSS = css`
  padding: 0 ${euiThemeVars.euiSizeS};
`;

/**
 * To avoid expensive changes to the DOM, delay showing the popover menu
 */
const HOVER_INTENT_DELAY = 100; // ms

interface Props {
  children: React.ReactNode;
  getActions: () => Promise<Action[]>;
  showMoreActionsFrom: number;
  actionContext: CellActionExecutionContext;
  showTooltip: boolean;
}

export const HoverActionsPopover = React.memo<Props>(
  ({ children, getActions, showMoreActionsFrom, actionContext, showTooltip }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExtraActionsPopoverOpen, setIsExtraActionsPopoverOpen] = useState(false);
    const [showHoverContent, setShowHoverContent] = useState(false);
    const [, setHoverTimeout] = useState<number | undefined>(undefined);
    const popoverRef = useRef<EuiPopover>(null);
    const [actions, setActions] = useState<Action[] | null>(null);

    const { visibleActions, extraActions } = useMemo(
      () => partitionActions(actions ?? [], showMoreActionsFrom),
      [actions, showMoreActionsFrom]
    );

    const closePopover = useCallback(() => {
      setHoverTimeout((prevHoverTimeout) => {
        clearTimeout(prevHoverTimeout);
        return undefined;
      });
      setShowHoverContent(false);
    }, []);

    const closeExtraActions = useCallback(
      () => setIsExtraActionsPopoverOpen(false),
      [setIsExtraActionsPopoverOpen]
    );

    const onShowExtraActionsClick = useCallback(() => {
      setIsExtraActionsPopoverOpen(true);
      closePopover();
    }, [closePopover, setIsExtraActionsPopoverOpen]);

    const onMouseEnter = useCallback(async () => {
      closeExtraActions(); // Closed extra actions when opening hover actions

      // memoize actions after the first call
      if (actions === null) {
        getActions().then((newActions) => setActions(newActions));
      }

      setHoverTimeout(
        Number(
          setTimeout(() => {
            // NOTE: the following read from the DOM is expensive, but not as
            // expensive as the default behavior, which adds a div to the body,
            // which-in turn performs a more expensive change to the layout
            if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
              setShowHoverContent(true);
            }
          }, HOVER_INTENT_DELAY)
        )
      );
    }, [closeExtraActions, getActions, actions]);

    const onMouseLeave = useCallback(() => {
      closePopover();
    }, [closePopover]);

    const content = useMemo(
      () => (
        <div ref={contentRef} onMouseEnter={onMouseEnter}>
          {children}
        </div>
      ),
      [children, onMouseEnter]
    );

    return (
      <>
        <div onMouseLeave={onMouseLeave}>
          <EuiPopover
            panelStyle={PANEL_STYLE}
            ref={popoverRef}
            anchorPosition={'downCenter'}
            button={content}
            closePopover={closePopover}
            hasArrow={false}
            isOpen={showHoverContent}
            panelPaddingSize="none"
            repositionOnScroll
            ownFocus={false}
            data-test-subj={'hoverActionsPopover'}
          >
            {showHoverContent ? (
              <div css={hoverContentWrapperCSS}>
                <EuiScreenReaderOnly>
                  <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(actionContext.field)}</p>
                </EuiScreenReaderOnly>
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
            ) : null}
          </EuiPopover>
        </div>
        <ExtraActionsPopOverWithAnchor
          actions={extraActions}
          anchorRef={contentRef}
          actionContext={actionContext}
          closePopOver={closeExtraActions}
          isOpen={isExtraActionsPopoverOpen}
        />
      </>
    );
  }
);

HoverActionsPopover.displayName = 'HoverActionsPopover';
