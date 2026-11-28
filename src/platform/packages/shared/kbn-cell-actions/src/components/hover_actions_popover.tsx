/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiButtonIconProps, EuiPopover, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import { ActionItem } from './cell_action_item';
import { ExtraActionsButton } from './extra_actions_button';
import { ACTIONS_AREA_LABEL, YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import { partitionActions } from '../hooks/actions';
import { ExtraActionsPopOverWithAnchor, OVERLAY_ANCHOR_STYLE } from './extra_actions_popover';
import type { CellActionExecutionContext } from '../types';
import { useLoadActionsFn } from '../hooks/use_load_actions';

/** This class is added to the document body while dragging */
export const IS_DRAGGING_CLASS_NAME = 'is-dragging';

// Overwrite Popover default minWidth to avoid displaying empty space
const PANEL_STYLE = { minWidth: `24px` };

// Same layout as the EuiPopover root (inline-block, positioned, capped to the parent's width).
// A plain style object (instead of the css prop) keeps the per-cell render cost low.
const ANCHOR_WRAPPER_STYLE = {
  position: 'relative',
  display: 'inline-block',
  verticalAlign: 'middle',
  maxWidth: '100%',
} as const;

const OVERLAY_ANCHOR_BUTTON = <span />;

const hoverContentWrapperCSS = css`
  padding: 0 ${euiThemeVars.euiSizeS};
`;

/**
 * To avoid expensive changes to the DOM, delay showing the popover menu
 */
const HOVER_INTENT_DELAY = 100; // ms

interface Props {
  anchorPosition: 'downCenter' | 'rightCenter';
  children: React.ReactNode;
  visibleCellActions: number;
  actionContext: CellActionExecutionContext;
  showActionTooltips: boolean;
  disabledActionTypes: string[];
  extraActionsIconType?: EuiButtonIconProps['iconType'];
  extraActionsColor?: EuiButtonIconProps['color'];
}

export const HoverActionsPopover: React.FC<Props> = ({
  anchorPosition,
  children,
  visibleCellActions,
  actionContext,
  showActionTooltips,
  disabledActionTypes,
  extraActionsIconType,
  extraActionsColor,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExtraActionsPopoverOpen, setIsExtraActionsPopoverOpen] = useState(false);
  const [showHoverContent, setShowHoverContent] = useState(false);
  // The popovers are only mounted once the first hover intent is confirmed (see the debounce below).
  // Mounting an EuiPopover per cell is expensive in large tables because each mount forces a
  // synchronous layout, so a pointer that merely crosses a cell must not pay for it.
  const [isActivated, setIsActivated] = useState(false);
  const [{ value: actions }, loadActions] = useLoadActionsFn({ disabledActionTypes });

  const { visibleActions, extraActions } = useMemo(
    () => partitionActions(actions ?? [], visibleCellActions),
    [actions, visibleCellActions]
  );

  const openPopOverDebounced = useMemo(
    () =>
      debounce(() => {
        if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
          setIsActivated(true);
          setShowHoverContent(true);
        }
      }, HOVER_INTENT_DELAY),
    []
  );
  useEffect(() => {
    return () => {
      openPopOverDebounced.cancel();
    };
  }, [openPopOverDebounced]);

  const closePopover = useCallback(() => {
    openPopOverDebounced.cancel();
    setShowHoverContent(false);
  }, [openPopOverDebounced]);

  // The content is not inside the popover root (the anchor is an empty overlay), so EUI would treat a
  // click on the still hovered content as an outside click. Keep it inside the dismissal boundary, the
  // actions close when the pointer leaves, on Escape, or on a click anywhere else.
  const onClickOutside = useCallback(
    (event: Event) => {
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return;
      closePopover();
    },
    [closePopover]
  );

  const closeExtraActions = useCallback(
    () => setIsExtraActionsPopoverOpen(false),
    [setIsExtraActionsPopoverOpen]
  );

  const onShowExtraActionsClick = useCallback(() => {
    setIsExtraActionsPopoverOpen(true);
    closePopover();
  }, [closePopover, setIsExtraActionsPopoverOpen]);

  const onMouseEnter = useCallback(async () => {
    // Do not open actions with extra action popover is open
    if (isExtraActionsPopoverOpen) return;

    // memoize actions after the first call
    if (actions === undefined) {
      loadActions(actionContext);
    }

    openPopOverDebounced();
  }, [isExtraActionsPopoverOpen, actions, openPopOverDebounced, loadActions, actionContext]);

  const panelStyle = useMemo(
    () => (anchorPosition === 'rightCenter' ? { marginTop: euiThemeVars.euiSizeS } : {}),
    [anchorPosition]
  );

  return (
    <div onMouseLeave={closePopover}>
      {/* Mimics the layout of the EuiPopover anchor wrapper (inline-block, positioned) so the layout
          does not change when the popovers get mounted. */}
      <div style={ANCHOR_WRAPPER_STYLE}>
        {/* The content is never moved nor re-created when the popovers get mounted, so it keeps its
            DOM node, local state and focus. The popovers are anchored to an overlay instead. */}
        <div ref={contentRef} onMouseEnter={onMouseEnter}>
          {children}
        </div>
        {isActivated && (
          <>
            <EuiPopover
              panelStyle={{ ...PANEL_STYLE, ...panelStyle }}
              anchorPosition={anchorPosition}
              display="block"
              style={OVERLAY_ANCHOR_STYLE}
              button={OVERLAY_ANCHOR_BUTTON}
              closePopover={closePopover}
              hasArrow={false}
              isOpen={showHoverContent}
              offset={0}
              // Avoid scrolling scrollable ancestors (e.g. flyout body) when focus moves into the panel;
              // react-focus-on maps this to focusOptions: { preventScroll: true } on react-focus-lock.
              focusTrapProps={{ preventScrollOnFocus: true, returnFocus: false, onClickOutside }}
              panelPaddingSize="none"
              repositionOnScroll
              panelProps={{ 'data-test-subj': 'hoverActionsPopover' }}
              aria-label={ACTIONS_AREA_LABEL}
            >
              {showHoverContent && (
                <div css={hoverContentWrapperCSS}>
                  <EuiScreenReaderOnly>
                    <p>
                      {YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(
                        actionContext.data.map(({ field }) => field.name).join(', ')
                      )}
                    </p>
                  </EuiScreenReaderOnly>
                  {visibleActions.map((action) => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      actionContext={actionContext}
                      showTooltip={showActionTooltips}
                      onClick={closePopover}
                    />
                  ))}
                  {extraActions.length > 0 && (
                    <ExtraActionsButton
                      onClick={onShowExtraActionsClick}
                      showTooltip={showActionTooltips}
                      extraActionsIconType={extraActionsIconType}
                      extraActionsColor={extraActionsColor}
                    />
                  )}
                </div>
              )}
            </EuiPopover>
            <ExtraActionsPopOverWithAnchor
              anchorPosition={anchorPosition}
              actions={extraActions}
              actionContext={actionContext}
              closePopOver={closeExtraActions}
              isOpen={isExtraActionsPopoverOpen}
            />
          </>
        )}
      </div>
    </div>
  );
};
