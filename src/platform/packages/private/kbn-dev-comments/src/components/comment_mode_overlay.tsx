/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { Global, css } from '@emotion/react';
import { IGNORE_SELECTOR } from '../constants';
import { isIgnored, promoteToCommentable } from '../lib/anchor';
import { useComments } from './comments_context';

const POINTER_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
] as const;

/** Ways of changing a field's value other than key presses. */
const INPUT_EVENTS = ['beforeinput', 'paste', 'cut', 'drop'] as const;

/** Keys that select the focused element as the comment's target. */
const SELECT_KEYS = ['Enter', ' '];

/** Keys that keep working on the page: moving focus, leaving comment mode, and browser or application shortcuts. */
const passesThrough = (event: KeyboardEvent): boolean =>
  event.key === 'Tab' ||
  event.key === 'Escape' ||
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  /^F\d{1,2}$/.test(event.key);

const centerOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
};

// Speech bubble with a plus; the hotspot is the bubble's tail.
const CURSOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
  '<path d="M6 2h13a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-6 5V5a3 3 0 0 1 3-3z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
  '<path d="M12.5 6.5v6M9.5 9.5h6" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';
const COMMENT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  CURSOR_SVG
)}") 3 22, crosshair`;

/**
 * Comment mode: pointer and keyboard input to the page is swallowed in the
 * capture phase, so the UI state being commented on does not change. Releasing
 * the pointer on an element starts a comment (or moves the one being written);
 * so do Enter and Space on the focused element, which Tab still moves between.
 */
export const CommentModeOverlay = () => {
  const controller = useComments();
  const { ignoreSelectors } = controller;

  const cursorStyles = useMemo(() => {
    const roots = [IGNORE_SELECTOR, ...ignoreSelectors];
    const ignored = roots.flatMap((selector) => [selector, `${selector} *`]).join(', ');
    return css`
      html,
      body,
      body *:not(${ignored}) {
        cursor: ${COMMENT_CURSOR} !important;
      }
      :where(${roots.join(', ')}) {
        cursor: auto;
      }
    `;
  }, [ignoreSelectors]);

  useEffect(() => {
    const pageTarget = (event: Event): Element | null => {
      const { target } = event;
      return target instanceof Element && !isIgnored(target, ignoreSelectors) ? target : null;
    };

    const onPointer = (event: Event) => {
      const target = pageTarget(event);
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      // On the pointer's release rather than the click: a disabled control gets
      // no click, and clicks the page synthesizes come without a pointer.
      if (event.type === 'pointerup' && event instanceof MouseEvent && event.button === 0) {
        controller.pick(
          promoteToCommentable(target),
          { x: event.clientX, y: event.clientY },
          target
        );
      }
    };

    const onInput = (event: Event) => {
      if (pageTarget(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      const target = pageTarget(event);

      if (!target || passesThrough(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const isSelection =
        event.type === 'keydown' &&
        SELECT_KEYS.includes(event.key) &&
        target !== document.body &&
        target !== document.documentElement;

      if (isSelection) {
        controller.pick(promoteToCommentable(target), centerOf(target), target);
      }
    };

    POINTER_EVENTS.forEach((type) => document.addEventListener(type, onPointer, true));
    INPUT_EVENTS.forEach((type) => document.addEventListener(type, onInput, true));
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    return () => {
      POINTER_EVENTS.forEach((type) => document.removeEventListener(type, onPointer, true));
      INPUT_EVENTS.forEach((type) => document.removeEventListener(type, onInput, true));
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKey, true);
    };
  }, [controller, ignoreSelectors]);

  return <Global styles={cursorStyles} />;
};
