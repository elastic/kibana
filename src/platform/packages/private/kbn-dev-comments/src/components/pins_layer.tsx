/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiPopover,
  euiCanAnimate,
  useEuiTheme,
  type EuiPopoverProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IGNORE_ATTR, PIN_SIZE } from '../constants';
import { getAnchorPoint } from '../lib/anchor';
import type { Comment } from '../types';
import { useComments, useCommentsState, usePageComments } from './comments_context';
import { useLayerPortal, useLayerZIndex } from './hooks';
import { pinShapeStyles } from './pin_marker';
import { PopoverBody } from './popover_body';
import { useResolvedAnchors } from './resolved_anchors';
import { ThreadContent } from './thread_content';

interface PositionedPin {
  comment: Comment;
  x: number;
  y: number;
}

const ignoreProps = { [IGNORE_ATTR]: true } as Record<string, unknown>;

type PopoverSide = Parameters<NonNullable<EuiPopoverProps['onPositionChange']>>[0];

const POPOVER_CHROME = 72;
const MIN_BODY_HEIGHT = 120;

const isOnScreen = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;

/** Room for the thread body on the side EUI placed the popover, so it scrolls instead of growing past the viewport when the screenshot is shown. */
const bodyMaxHeight = (side: PopoverSide, y: number): number =>
  Math.max(
    MIN_BODY_HEIGHT,
    (side === 'top' ? y - PIN_SIZE : window.innerHeight - y) - POPOVER_CHROME
  );

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
  /** The thread was opened without a pointer (keyboard, guide); the pin takes focus so the thread is reachable. */
  takeFocus: boolean;
  zIndex: number;
  onToggle: () => void;
  onClose: () => void;
  onFocused: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { comment, x, y } = pin;
  const { author, resolved } = comment;
  const count = threadSize(comment);
  // The popover panel is inserted next to the pin, inside the layer's container, so it stacks with the layer.
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const [side, setSide] = useState<PopoverSide>('bottom');
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
      {/* The author's avatar, as in the thread, so the pin tells who commented. */}
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
      ref={setWrapper}
      css={css`
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -100%);
      `}
    >
      <EuiPopover
        button={button}
        aria-label={i18n.translate('devComments.pin.threadLabel', {
          defaultMessage: 'Comment thread',
        })}
        isOpen={isActive && wrapper !== null}
        // Outside clicks reaching EUI are on developer tool UI (the comments panel) and must not close the thread; Close, Esc and page clicks do.
        closePopover={() => {}}
        anchorPosition="downCenter"
        panelPaddingSize="m"
        repositionOnScroll
        panelProps={ignoreProps}
        ownFocus={false}
        zIndex={zIndex}
        insert={wrapper ? { sibling: wrapper, position: 'after' } : undefined}
        onPositionChange={setSide}
      >
        <PopoverBody maxHeight={bodyMaxHeight(side, y)}>
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
  const comments = usePageComments();
  const resolvedAnchors = useResolvedAnchors();
  const activeThreadId = useCommentsState((state) => state.activeThreadId);
  const focusPinId = useCommentsState((state) => state.focusPinId);

  const pins = comments.flatMap<PositionedPin>((comment) => {
    const resolved = resolvedAnchors.get(comment.id);
    if (!resolved) {
      return [];
    }
    const { x, y } = getAnchorPoint(comment.anchor, resolved.element);
    if (!isOnScreen(x, y)) {
      return [];
    }
    return [{ comment, x, y }];
  });

  if (!container) {
    return null;
  }

  return createPortal(
    <>
      {pins.map((pin) => (
        <Pin
          key={pin.comment.id}
          pin={pin}
          zIndex={zIndex.popover}
          isActive={activeThreadId === pin.comment.id}
          takeFocus={focusPinId === pin.comment.id}
          onToggle={() =>
            controller.openThread(activeThreadId === pin.comment.id ? null : pin.comment.id)
          }
          onClose={() => controller.openThread(null)}
          onFocused={() => controller.pinFocused(pin.comment.id)}
        />
      ))}
    </>,
    container
  );
};
