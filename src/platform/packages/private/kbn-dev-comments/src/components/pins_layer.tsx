/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { EuiAvatar, EuiPopover, euiCanAnimate, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PIN_SIZE } from '../constants';
import { isInTooltip, isOnScreen } from '../lib/anchor';
import type { Comment } from '../types';
import { useComments, useCommentsState, usePageComments } from './comments_context';
import {
  atTooltipPanelProps,
  atTooltipProps,
  popoverPanelProps,
  useLayerPortal,
  useLayerZIndex,
  usePanelZIndex,
} from './hooks';
import { pinShapeStyles } from './pin_marker';
import { PopoverBody } from './popover_body';
import { useResolvedAnchors } from './resolved_anchors';
import { ThreadContent } from './thread_content';

interface PositionedPin {
  comment: Comment;
  x: number;
  y: number;
  /** The element is in a tooltip: the pin is drawn over it, and must not take focus, which may be what shows the tooltip. */
  inTooltip: boolean;
}

const keepFocus = (event: React.MouseEvent) => event.preventDefault();

/** Panel padding, arrow and the distance EUI keeps from the viewport's edge. */
const POPOVER_CHROME = 72;
/** Room for the thread's actions and reply form; past the viewport's edge beats unusable. */
const MIN_BODY_HEIGHT = 300;

/** The side of the pin with more room, and the room there, so the thread scrolls instead of growing past the viewport. */
const placePopover = (y: number): { side: 'top' | 'bottom'; maxHeight: number } => {
  const above = y - PIN_SIZE;
  const below = window.innerHeight - y;
  return {
    side: above > below ? 'top' : 'bottom',
    maxHeight: Math.max(MIN_BODY_HEIGHT, Math.max(above, below) - POPOVER_CHROME),
  };
};

export const threadSize = (comment: Comment): number => 1 + comment.replies.length;

const Pin = ({
  pin,
  isActive,
  takeFocus,
  zIndex,
  onToggle,
  onClose,
  onFocused,
}: {
  pin: PositionedPin;
  isActive: boolean;
  /** The thread was opened without a pointer: the pin takes focus so the thread is reachable. */
  takeFocus: boolean;
  zIndex: number;
  onToggle: () => void;
  onClose: () => void;
  onFocused: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { comment, x, y, inTooltip } = pin;
  const { author, resolved } = comment;
  const count = threadSize(comment);
  const placement = placePopover(y);
  const panelRef = usePanelZIndex(zIndex);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (takeFocus) {
      buttonRef.current?.focus({ preventScroll: true });
      onFocused();
    }
  }, [takeFocus, onFocused]);

  const button = (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      onMouseDown={inTooltip ? keepFocus : undefined}
      aria-label={
        resolved
          ? i18n.translate('devComments.pin.resolvedLabel', {
              defaultMessage:
                'Resolved comment by {author}, {count, plural, one {# message} other {# messages}}',
              values: { count, author: author.displayName },
            })
          : i18n.translate('devComments.pin.label', {
              defaultMessage:
                'Comment by {author}, {count, plural, one {# message} other {# messages}}',
              values: { count, author: author.displayName },
            })
      }
      aria-expanded={isActive}
      css={css`
        display: inline-flex;
        padding: 0;
        border: 0;
        border-radius: 50% 50% 50% 0;
        background: none;
        cursor: pointer;
        pointer-events: auto;
        transform: ${isActive ? 'scale(1.15)' : 'none'};
        &:hover {
          transform: scale(1.15);
        }
        ${euiCanAnimate} {
          transition: transform 120ms ease-out;
        }
      `}
      data-test-subj={`devCommentsPin-${comment.id}`}
    >
      <EuiAvatar
        name={author.displayName}
        size="s"
        initialsLength={1}
        aria-hidden={true}
        css={pinShapeStyles(euiTheme, { resolved })}
      />
    </button>
  );

  return (
    <div
      css={css`
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -100%);
      `}
      {...(inTooltip ? atTooltipProps : {})}
    >
      {/* Portalled to `body`: inside the pins' container it could not stack above the comments panel. */}
      <EuiPopover
        button={button}
        aria-label={i18n.translate('devComments.pin.threadLabel', {
          defaultMessage: 'Comment thread',
        })}
        isOpen={isActive}
        // Outside clicks reaching EUI are on the layer's UI; Close, Esc and page clicks close the thread.
        closePopover={() => {}}
        anchorPosition={placement.side === 'top' ? 'upCenter' : 'downCenter'}
        panelPaddingSize="none"
        repositionOnScroll
        panelProps={inTooltip ? atTooltipPanelProps : popoverPanelProps}
        panelRef={panelRef}
        ownFocus={false}
        zIndex={zIndex}
      >
        <PopoverBody maxHeight={placement.maxHeight}>
          <ThreadContent comment={comment} onClose={onClose} />
        </PopoverBody>
      </EuiPopover>
    </div>
  );
};

export const PinsLayer = () => {
  const controller = useComments();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('devCommentsPins', zIndex.pins);
  const tooltipContainer = useLayerPortal('devCommentsTooltipPins', zIndex.tooltipPins);
  const comments = usePageComments();
  const resolvedAnchors = useResolvedAnchors();
  const activeThreadId = useCommentsState((state) => state.activeThreadId);
  const focusPinId = useCommentsState((state) => state.focusPinId);

  // A pin goes where its element shows, not over the dialog or menu covering it.
  const pins = comments.flatMap<PositionedPin>((comment) => {
    const placed = resolvedAnchors.get(comment.id);
    return placed && placed.exposed && isOnScreen(placed.point)
      ? [{ comment, ...placed.point, inTooltip: isInTooltip(placed.element) }]
      : [];
  });

  if (!container || !tooltipContainer) {
    return null;
  }

  const renderPin = (pin: PositionedPin) => {
    const { id } = pin.comment;
    return (
      <Pin
        key={id}
        pin={pin}
        zIndex={pin.inTooltip ? zIndex.tooltipPopover : zIndex.popover}
        isActive={activeThreadId === id}
        takeFocus={focusPinId === id}
        onToggle={() => controller.openThread(activeThreadId === id ? null : id)}
        onClose={() => controller.openThread(null)}
        onFocused={() => controller.pinFocused(id)}
      />
    );
  };

  return (
    <>
      {createPortal(pins.filter((pin) => !pin.inTooltip).map(renderPin), container)}
      {createPortal(pins.filter((pin) => pin.inTooltip).map(renderPin), tooltipContainer)}
    </>
  );
};
