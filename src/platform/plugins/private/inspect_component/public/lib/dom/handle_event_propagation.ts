/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Options for {@link handleEventPropagation}
 */
interface HandleEventPropagationOptions {
  /** The mouse event to handle. */
  event: MouseEvent;
  /** The callback to invoke if the event should be handled. */
  callback: (e: MouseEvent) => void;
}

/**
 * Handle event propagation for inspected elements.
 * It invokes the provided callback only for click events or if the target element is disabled.
 * This allows for inspecting disabled elements and prevents triggering 'onClick' behavior on underlying elements.
 * @param {HandleEventPropagationOptions} options
 * @param {MouseEvent} options.event The mouse event to handle.
 * @param {function} options.callback The callback to invoke if the event should be handled.
 * @return {void}
 */
export const handleEventPropagation = ({
  event,
  callback,
}: HandleEventPropagationOptions): void => {
  event.stopPropagation();
  event.preventDefault();
  const eventTarget = event.target as HTMLElement;
  const isTargetDisabled = eventTarget?.hasAttribute && eventTarget.hasAttribute('disabled');
  const isClickEvent = event.type === 'click';

  /**
   * We want to block propagation of click events to not trigger 'onClick' behavior, but at the same time
   * allow inspecting disabled elements and allow hover events.
   * To access disabled elements we need to handle this on 'pointerdown' event as 'click' event is not triggered
   * for disabled elements. But we can't simply allow inspecting on 'pointerdown' as it would trigger 'onClick'
   * behavior on underlying elements. So the solution is to inspect on 'pointerdown'
   * only if the target element is disabled.
   */
  if (isClickEvent || isTargetDisabled) {
    callback(event);
  }
};
