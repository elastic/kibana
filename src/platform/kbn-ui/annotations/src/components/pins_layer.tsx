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
import { EuiPopover, euiCanAnimate, useEuiTheme, type EuiPopoverProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IGNORE_ATTR, PIN_SIZE } from '../constants';
import { getAnchorPoint } from '../lib/anchor';
import type { Annotation } from '../types';
import { useAnnotations, useAnnotationsState, usePageAnnotations } from './annotations_context';
import { useLayerPortal, useLayerZIndex } from './hooks';
import { pinShapeStyles } from './pin_marker';
import { PopoverBody } from './popover_body';
import { useResolvedAnchors } from './resolved_anchors';
import { ThreadContent } from './thread_content';

interface PositionedPin {
  annotation: Annotation;
  x: number;
  y: number;
  exact: boolean;
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

export const threadSize = (annotation: Annotation): number => 1 + annotation.replies.length;

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
  const { annotation, x, y, exact } = pin;
  const count = threadSize(annotation);
  const background = annotation.resolved ? euiTheme.colors.success : euiTheme.colors.primary;
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
        annotation.resolved
          ? i18n.translate('kbnUI.annotations.pin.resolvedLabel', {
              defaultMessage:
                'Resolved comment by {author}, {count, plural, one {# message} other {# messages}}',
              values: { count, author: annotation.author.displayName },
            })
          : i18n.translate('kbnUI.annotations.pin.label', {
              defaultMessage:
                'Comment by {author}, {count, plural, one {# message} other {# messages}}',
              values: { count, author: annotation.author.displayName },
            })
      }
      aria-expanded={isActive}
      css={[
        pinShapeStyles(euiTheme, { background, dashed: !exact }),
        css`
          cursor: pointer;
          pointer-events: auto;
          transform: ${isActive ? 'scale(1.15)' : 'none'};
          &:hover {
            transform: scale(1.15);
          }
          ${euiCanAnimate} {
            transition: transform 120ms ease-out;
          }
        `,
      ]}
      data-test-subj={`kbnUiAnnotationsPin-${annotation.id}`}
    >
      {count}
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
        aria-label={i18n.translate('kbnUI.annotations.pin.threadLabel', {
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
          <ThreadContent annotation={annotation} onClose={onClose} />
        </PopoverBody>
      </EuiPopover>
    </div>
  );
};

export const PinsLayer = () => {
  const controller = useAnnotations();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('kbnUiAnnotationsPins', zIndex.pins);
  const annotations = usePageAnnotations();
  const resolvedAnchors = useResolvedAnchors();
  const activeThreadId = useAnnotationsState((state) => state.activeThreadId);
  const focusPinId = useAnnotationsState((state) => state.focusPinId);

  const pins = annotations.flatMap<PositionedPin>((annotation) => {
    const resolved = resolvedAnchors.get(annotation.id);
    if (!resolved) {
      return [];
    }
    const { x, y } = getAnchorPoint(annotation.anchor, resolved.element);
    if (!isOnScreen(x, y)) {
      return [];
    }
    return [{ annotation, x, y, exact: resolved.exact }];
  });

  if (!container) {
    return null;
  }

  return createPortal(
    <>
      {pins.map((pin) => (
        <Pin
          key={pin.annotation.id}
          pin={pin}
          zIndex={zIndex.popover}
          isActive={activeThreadId === pin.annotation.id}
          takeFocus={focusPinId === pin.annotation.id}
          onToggle={() =>
            controller.openThread(activeThreadId === pin.annotation.id ? null : pin.annotation.id)
          }
          onClose={() => controller.openThread(null)}
          onFocused={() => controller.pinFocused(pin.annotation.id)}
        />
      ))}
    </>,
    container
  );
};
