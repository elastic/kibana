/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPopover } from '@elastic/eui';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
// TODO move it to another package? security-solution-ui??

/** This class is added to the document body while dragging */
export const IS_DRAGGING_CLASS_NAME = 'is-dragging';

/**
 * To avoid expensive changes to the DOM, delay showing the popover menu
 */
const HOVER_INTENT_DELAY = 100; // ms

const euiPopoverCSS = css`
  .euiPopover__anchor {
    width: 100%;
  }
`;

interface Props {
  children: React.ReactNode;
  /**
   * Always show the hover menu contents (default: false)
   */
  alwaysShow?: boolean;
  /**
   * The hover menu is closed whenever this prop changes
   */
  closePopOverTrigger?: boolean;
  /**
   * Function that return the contents of the hover menu. It is highly recommended you wrap this
   * content in a `div` with `position: absolute` to prevent it from effecting
   * layout, and to adjust it's position via `top` and `left`.
   * The function will be called once the first time the hover event starts for performance optimization.
   */
  getHoverContent: (closePopover: () => void) => JSX.Element;

  /**
   * This optional callback is invoked when a close is requested via user
   * intent, i.e. by clicking outside of the popover, moving the mouse
   * away, or pressing Escape. It's only a "request" to close, because
   * the hover menu will NOT be closed if `alwaysShow` is `true`.
   *
   * Use this callback when you're managing the state of `alwaysShow`
   * (outside of this component), and you want to be informed of a user's
   * intent to close the hover menu.
   */
  onCloseRequested?: () => void;
}

/**
 * Decorates it's children with actions that are visible on hover.
 * This component does not enforce an opinion on the styling and
 * positioning of the hover content, but see the documentation for
 * the `hoverContent` for tips on (not) effecting layout on-hover.
 *
 * In addition to rendering the `hoverContent` prop on hover, this
 * component also passes `showHoverContent` as a render prop, which
 * provides a signal to the content that the user is in a hover state.
 *
 * IMPORTANT: This hover menu delegates focus management to the
 * `hoverContent` and does NOT own focus, because it should not
 * automatically "steal" focus. You must manage focus ownership,
 * otherwise it will be difficult for keyboard-only and screen
 * reader users to navigate to and from your popover.
 */
export const HoverActionsPopover = React.memo<Props>(
  ({ closePopOverTrigger, getHoverContent, onCloseRequested, children }) => {
    const [showHoverContent, setShowHoverContent] = useState(false);
    const [, setHoverTimeout] = useState<number | undefined>(undefined);
    const popoverRef = useRef<EuiPopover>(null);

    const tryClosePopover = useCallback(() => {
      setHoverTimeout((prevHoverTimeout) => {
        clearTimeout(prevHoverTimeout);
        return undefined;
      });

      setShowHoverContent(false);

      if (onCloseRequested != null) {
        onCloseRequested();
      }
    }, [onCloseRequested]);

    // TODO Cache the returned value of getHoverContent() for performance optimization on successive calls.
    const hoverContent = useMemo(
      () => (showHoverContent ? getHoverContent(() => tryClosePopover()) : null),

      [getHoverContent, showHoverContent, tryClosePopover]
    );

    const onMouseEnter = useCallback(() => {
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
    }, [setHoverTimeout, setShowHoverContent]);

    const onMouseLeave = useCallback(() => {
      tryClosePopover();
    }, [tryClosePopover]);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (showHoverContent && keyboardEvent.key === 'Escape') {
          onMouseLeave();
        }
      },
      [showHoverContent, onMouseLeave]
    );

    const content = useMemo(
      () => (
        <div data-test-subj="withHoverActionsButton" onMouseEnter={onMouseEnter}>
          {children}
        </div>
      ),
      [children, onMouseEnter]
    );

    useEffect(() => {
      setShowHoverContent(false);
    }, [closePopOverTrigger]); // NOTE: the `closePopOverTrigger` dependency here will close the hover menu whenever `closePopOverTrigger` changes

    // useEffect(() => {
    //   // in case of dynamic content i.e when the value of hoverContent changes,
    //   // we will try to reposition the popover so that the content does not collide with screen edge.
    //   if (showHoverContent) popoverRef?.current?.positionPopoverFluid();
    // }, [hoverContent, showHoverContent]);

    return (
      <div onMouseLeave={onMouseLeave}>
        <EuiPopover
          css={euiPopoverCSS}
          ref={popoverRef}
          anchorPosition={'downCenter'}
          button={content}
          closePopover={tryClosePopover}
          hasArrow={false}
          isOpen={showHoverContent}
          panelPaddingSize="none"
          repositionOnScroll
          ownFocus={false}
        >
          {showHoverContent ? <div onKeyDown={onKeyDown}>{hoverContent}</div> : null}
        </EuiPopover>
      </div>
    );
  }
);

HoverActionsPopover.displayName = 'WithHoverActions';
