/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPopover, EuiScreenReaderOnly, type EuiButtonIconProps } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import { ActionItem } from './cell_action_item';
import { ExtraActionsButton } from './extra_actions_button';
import { ACTIONS_AREA_LABEL, YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS } from './translations';
import { partitionActions } from '../hooks/actions';
import { ExtraActionsPopOverWithAnchor } from './extra_actions_popover';
import type { CellActionExecutionContext } from '../types';
import { useLoadActionsFn } from '../hooks/use_load_actions';

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

  const [{ value: actions }, loadActions] = useLoadActionsFn({ disabledActionTypes });

  const { visibleActions, extraActions } = useMemo(
    () => partitionActions(actions ?? [], visibleCellActions),
    [actions, visibleCellActions]
  );

  const openPopOverDebounced = useMemo(
    () =>
      debounce(() => {
        if (!document.body.classList.contains(IS_DRAGGING_CLASS_NAME)) {
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

  const content = useMemo(() => {
    return (
      // Hack - Forces extra actions popover to close when hover content is clicked.
      // This hack is required because we anchor the popover to the hover content instead
      // of anchoring it to the button that triggers the popover.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div ref={contentRef} onMouseEnter={onMouseEnter} onClick={closeExtraActions}>
        {children}
      </div>
    );
  }, [onMouseEnter, closeExtraActions, children]);

  const panelStyle = useMemo(
    () => (anchorPosition === 'rightCenter' ? { marginTop: euiThemeVars.euiSizeS } : {}),
    [anchorPosition]
  );

  return (
    <>
      <div onMouseLeave={closePopover}>
        <EuiPopover
          panelStyle={{ ...PANEL_STYLE, ...panelStyle }}
          anchorPosition={anchorPosition}
          button={content}
          closePopover={closePopover}
          hasArrow={false}
          isOpen={showHoverContent}
          panelPaddingSize="none"
          repositionOnScroll
          ownFocus={false}
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
      </div>
      <ExtraActionsPopOverWithAnchor
        anchorPosition={anchorPosition}
        actions={extraActions}
        anchorRef={contentRef}
        actionContext={actionContext}
        closePopOver={closeExtraActions}
        isOpen={isExtraActionsPopoverOpen}
      />
    </>
  );
};
