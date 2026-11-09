/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** With Alt held, pointer input in comment mode goes to the page instead of starting a comment. */
export const holdsPassThrough = (event: MouseEvent): boolean => event.altKey;

let dispatching = 0;

/** Whether a click handed to the page by `passThrough` is being dispatched, the clicks the page fires while handling it (a label's on its control) included. */
export const isPassingThrough = (): boolean => dispatching > 0;

/**
 * Hands the click to the page as one made without Alt (on which links leave the
 * click to the browser, which downloads). The original is the caller's to stop.
 * The copy waits for the original's dispatch to end: a stopped click's checkbox
 * is toggled back after its listeners, which would undo a copy dispatched within.
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
