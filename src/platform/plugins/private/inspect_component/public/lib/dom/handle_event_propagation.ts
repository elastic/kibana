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
 * Handles event propagation for inspected HTML elements.
 * Prevents triggering 'onClick' behavior.
 * Allows for inspecting disabled HTML elements.
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
   * Blocks propagation of click events to stop triggering 'onClick' behavior and at the same time
   * allows hover events and inspecting disabled HTML elements.
   * To inspect disabled HTML elements 'pointerdown' event is used because 'click' event type is not triggered
   * for them. Blocking 'onClick' behavior is not possible for 'pointerdown' event, so for this event type
   * we allow event propagation only if the inspected HTML element is disabled.
   */
  if (isClickEvent || isTargetDisabled) {
    callback(event);
  }
};
