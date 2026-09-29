/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * With Alt held, pointer input in comment mode goes to the page instead of
 * starting a comment: a flyout can be opened or a link followed without leaving
 * the mode, and the click counts towards the trail like any other.
 */
export const holdsPassThrough = (event: MouseEvent): boolean => event.altKey;

/** Depth of `passThrough` dispatches in progress. */
let dispatching = 0;

/**
 * Whether a click handed to the page by `passThrough` is being dispatched. The
 * clicks the page fires while handling it count as well: a label's on its control.
 */
export const isPassingThrough = (): boolean => dispatching > 0;

/**
 * Hands the click to the page as one made without Alt, which the page must not
 * see: links leave a modified click to the browser, and the browser downloads on
 * Alt. The original is the caller's to stop. The copy waits for the original's
 * dispatch to end: a checkbox or radio is toggled before its click's listeners
 * run and toggled back after them when the click was stopped, which would undo
 * a copy dispatched from within.
 */
export const passThrough = (event: MouseEvent): void => {
  const { target } = event;
  const copy = new MouseEvent(event.type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: event.view,
    detail: event.detail,
    screenX: event.screenX,
    screenY: event.screenY,
    clientX: event.clientX,
    clientY: event.clientY,
    button: event.button,
    buttons: event.buttons,
    relatedTarget: event.relatedTarget,
  });
  setTimeout(() => {
    dispatching += 1;
    try {
      target?.dispatchEvent(copy);
    } finally {
      dispatching -= 1;
    }
  });
};
