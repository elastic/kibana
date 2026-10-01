/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, ReactElement } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, EuiPortal, keys, useEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import {
  TANSTACK_CELL_ACTIONS_CLASS,
  tanStackCellActionsStyles,
} from './tanstack_cell_actions_styles';

const CELL_ACTIONS_HOVER_OPEN_DELAY_MS = 350;
const CELL_ACTION_ICON_WIDTH = 28;

const estimateCellActionsOpenWidth = (actionCount: number, insetPx: number) =>
  actionCount * CELL_ACTION_ICON_WIDTH + Math.max(0, actionCount - 1) * insetPx + insetPx * 2;

const cellActionsNeedFixedLayer = (
  cellElement: HTMLElement | null,
  actionCount: number,
  insetPx: number
) => {
  if (!cellElement) {
    return false;
  }
  const cellWidth = cellElement.getBoundingClientRect().width;
  const openWidth = estimateCellActionsOpenWidth(actionCount, insetPx);
  return openWidth > cellWidth - insetPx;
};

export interface TanStackCellActionsBubbleProps {
  actionButtons: ReactElement[];
  anchorCellRef: React.RefObject<HTMLElement | null>;
  /** Keeps the trigger visible when a related popover (e.g. expand) is open. */
  stayVisible?: boolean;
  triggerTestSubj?: string;
  toolbarAriaLabel?: string;
}

export const TanStackCellActionsBubble = React.memo(
  ({
    actionButtons,
    anchorCellRef,
    stayVisible = false,
    triggerTestSubj = 'tanStackCellActionsButton',
    toolbarAriaLabel,
  }: TanStackCellActionsBubbleProps) => {
    const { euiTheme } = useEuiTheme();
    const styles = useMemoCss(tanStackCellActionsStyles);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [useFixedLayer, setUseFixedLayer] = useState(false);
    const [fixedLayerStyle, setFixedLayerStyle] = useState<CSSProperties>();
    const collapsedRadius = euiTheme.border.radius.small;
    const openRadius = euiTheme.size.m;
    const actionInsetPx = parseInt(euiTheme.size.xxs, 10) || 4;
    const actionCount = actionButtons.length;

    const cellActionsLabel =
      toolbarAriaLabel ??
      i18n.translate('unifiedDataTable.tanStack.cellActionsButtonAriaLabel', {
        defaultMessage: 'Cell actions',
      });

    const clearOpenTimer = useCallback(() => {
      if (openTimerRef.current !== null) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    }, []);

    const playMorph = useCallback(
      (nextOpen: boolean) => {
        const el = bubbleRef.current;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!el || reduceMotion) {
          setIsOpen(nextOpen);
          return;
        }

        const firstWidth = el.getBoundingClientRect().width;
        setIsOpen(nextOpen);
        requestAnimationFrame(() => {
          const node = bubbleRef.current;
          if (!node) {
            return;
          }
          const lastWidth = node.getBoundingClientRect().width;
          const scaleX = firstWidth / Math.max(lastWidth, 1);
          if (!node.animate) {
            return;
          }
          node.getAnimations?.().forEach((animation) => animation.cancel());
          node.animate(
            nextOpen
              ? [
                  { transform: `scaleX(${scaleX})`, borderRadius: collapsedRadius },
                  { transform: 'scaleX(1.06)', borderRadius: '14px', offset: 0.58 },
                  { transform: 'scaleX(1)', borderRadius: openRadius },
                ]
              : [
                  { transform: `scaleX(${scaleX})`, borderRadius: openRadius },
                  { transform: 'scaleX(1)', borderRadius: collapsedRadius },
                ],
            {
              duration: nextOpen ? 420 : 240,
              easing: nextOpen
                ? 'cubic-bezier(0.22, 0.8, 0.28, 1)'
                : 'cubic-bezier(0.4, 0, 0.2, 1)',
            }
          );
        });
      },
      [collapsedRadius, openRadius]
    );

    const refreshFixedLayer = useCallback(() => {
      const needsFixedLayer = cellActionsNeedFixedLayer(
        anchorCellRef.current,
        actionCount,
        actionInsetPx
      );
      setUseFixedLayer(needsFixedLayer);
      if (needsFixedLayer && anchorCellRef.current) {
        const rect = anchorCellRef.current.getBoundingClientRect();
        setFixedLayerStyle({
          top: rect.top + actionInsetPx,
          right: window.innerWidth - rect.right + actionInsetPx,
        });
      }
      return needsFixedLayer;
    }, [actionCount, actionInsetPx, anchorCellRef]);

    const openBubble = useCallback(() => {
      if (isOpen) {
        return;
      }
      clearOpenTimer();
      refreshFixedLayer();
      playMorph(true);
    }, [clearOpenTimer, isOpen, playMorph, refreshFixedLayer]);

    const closeBubble = useCallback(
      (returnFocusToTrigger = false) => {
        clearOpenTimer();
        if (!isOpen) {
          return;
        }
        setUseFixedLayer(false);
        playMorph(false);
        if (returnFocusToTrigger) {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      },
      [clearOpenTimer, isOpen, playMorph]
    );

    const scheduleOpen = useCallback(() => {
      if (isOpen) {
        return;
      }
      clearOpenTimer();
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        openBubble();
      }, CELL_ACTIONS_HOVER_OPEN_DELAY_MS);
    }, [clearOpenTimer, isOpen, openBubble]);

    useEffect(() => {
      if (!isOpen || !useFixedLayer) {
        return;
      }
      const updateFixedLayer = () => refreshFixedLayer();
      window.addEventListener('scroll', updateFixedLayer, true);
      window.addEventListener('resize', updateFixedLayer);
      return () => {
        window.removeEventListener('scroll', updateFixedLayer, true);
        window.removeEventListener('resize', updateFixedLayer);
      };
    }, [isOpen, refreshFixedLayer, useFixedLayer]);

    useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

    const handleBubbleMouseEnter = useCallback(() => {
      if (!isOpen) {
        scheduleOpen();
      }
    }, [isOpen, scheduleOpen]);

    const handleBubbleMouseLeave = useCallback(() => {
      clearOpenTimer();
      if (isOpen) {
        closeBubble(false);
      }
    }, [clearOpenTimer, closeBubble, isOpen]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const focusFirstAction = () => {
        bubbleRef.current?.querySelector<HTMLElement>('button')?.focus();
      };
      const focusFrame = requestAnimationFrame(focusFirstAction);

      const onPointerDown = (event: PointerEvent) => {
        if (!bubbleRef.current?.contains(event.target as Node)) {
          closeBubble(true);
        }
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === keys.ESCAPE) {
          event.stopPropagation();
          closeBubble(true);
        }
      };

      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown, true);
      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }, [closeBubble, isOpen]);

    const handleTriggerClick = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isOpen) {
          closeBubble(true);
        } else {
          openBubble();
        }
      },
      [closeBubble, isOpen, openBubble]
    );

    const handleTriggerKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === keys.ENTER || event.key === keys.SPACE) {
          event.preventDefault();
          if (isOpen) {
            closeBubble(true);
          } else {
            openBubble();
          }
        }
      },
      [closeBubble, isOpen, openBubble]
    );

    const handleToolbarKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== keys.ARROW_LEFT && event.key !== keys.ARROW_RIGHT) {
        return;
      }
      const toolbar = bubbleRef.current?.querySelector<HTMLElement>('[role="toolbar"]');
      const toolbarActionButtons = toolbar
        ? Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button'))
        : [];
      if (toolbarActionButtons.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const currentIndex = toolbarActionButtons.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const delta = event.key === keys.ARROW_RIGHT ? 1 : -1;
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + delta + toolbarActionButtons.length) % toolbarActionButtons.length
          : delta > 0
          ? 0
          : toolbarActionButtons.length - 1;
      toolbarActionButtons[nextIndex]?.focus();
    }, []);

    const bubble = (
      <div
        ref={bubbleRef}
        className={TANSTACK_CELL_ACTIONS_CLASS}
        css={[
          styles.cellActions,
          stayVisible && styles.cellActionsStayVisible,
          isOpen && useFixedLayer && styles.cellActionsFixed,
          isOpen && styles.cellActionsOpen,
        ]}
        style={isOpen && useFixedLayer ? fixedLayerStyle : undefined}
        onMouseEnter={handleBubbleMouseEnter}
        onMouseLeave={handleBubbleMouseLeave}
      >
        {isOpen ? (
          <div
            role="toolbar"
            aria-label={cellActionsLabel}
            css={styles.cellActionsToolbar}
            onKeyDown={handleToolbarKeyDown}
          >
            {actionButtons.map((button, index) => (
              <span
                key={button.key ?? index}
                css={styles.cellActionPop}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                {button}
              </span>
            ))}
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @elastic/eui/tooltip-button-icon-wrap -- Ellipsis opens the toolbar; per-action tooltips appear on the expanded buttons. */}
            <EuiButtonIcon
              buttonRef={triggerRef}
              color="text"
              display="base"
              iconType="ellipsis"
              size="xs"
              iconSize="s"
              aria-label={cellActionsLabel}
              aria-haspopup={true}
              aria-expanded={isOpen}
              data-test-subj={triggerTestSubj}
              onClick={handleTriggerClick}
              onKeyDown={handleTriggerKeyDown}
            />
          </>
        )}
      </div>
    );

    if (isOpen && useFixedLayer) {
      return <EuiPortal>{bubble}</EuiPortal>;
    }

    return bubble;
  }
);

TanStackCellActionsBubble.displayName = 'TanStackCellActionsBubble';
