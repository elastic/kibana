/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserInteractionEvent } from '../../types';
import { KeyboardCode, KeyboardCodes, UserKeyboardEvent } from './types';

type EventHandler = (e: UserInteractionEvent) => void;

const keyboardCodes: KeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
  move: [KeyboardCode.Right, KeyboardCode.Left, KeyboardCode.Down, KeyboardCode.Up],
};

const isStartKey = (e: UserKeyboardEvent) => keyboardCodes.start.includes(e.code);
const isEndKey = (e: UserKeyboardEvent) => keyboardCodes.end.includes(e.code);
const isCancelKey = (e: UserKeyboardEvent) => keyboardCodes.cancel.includes(e.code);
const isMoveKey = (e: UserKeyboardEvent) => keyboardCodes.move.includes(e.code);

const preventDefault = (e: Event) => e.preventDefault();

const disableScroll = () => window.addEventListener('wheel', preventDefault, { passive: false });
const enableScroll = () => window.removeEventListener('wheel', preventDefault);

export const startKeyboardInteraction = ({
  e,
  onStart,
  onMove,
  onEnd,
  onCancel,
  onBlur,
}: {
  e: UserKeyboardEvent;
  onMove: EventHandler;
  onStart: EventHandler;
  onEnd: EventHandler;
  onCancel: EventHandler;
  onBlur?: EventHandler;
}) => {
  const handleStart = (ev: UserKeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    onStart(ev);
    disableScroll();

    const handleBlur = (blurEvent: Event) => {
      onBlur?.(blurEvent);
      enableScroll();
    };

    document.addEventListener('keydown', handleKeyPress);
    /**
     * TODO: Blur is firing on re-render, so use `mousedown` instead
     * This should be fixed b∂y https://github.com/elastic/kibana/issues/220309
     */
    // ev.target?.addEventListener('blur', handleBlur, { once: true });
    document.addEventListener('mousedown', handleBlur, { once: true });
  };

  const handleMove = (ev: UserKeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    onMove(ev);
  };

  const handleEnd = (ev: UserKeyboardEvent) => {
    document.removeEventListener('keydown', handleKeyPress);
    ev.preventDefault();
    enableScroll();
    onEnd(ev);
  };

  const handleCancel = (ev: UserKeyboardEvent) => {
    document.removeEventListener('keydown', handleKeyPress);
    enableScroll();
    onCancel(ev);
  };

  const handleKeyPress = (ev: UserKeyboardEvent) => {
    if (isMoveKey(ev)) handleMove(ev);
    else if (isEndKey(ev)) handleEnd(ev);
    else if (isCancelKey(ev)) handleCancel(ev);
  };

  if (isStartKey(e)) {
    handleStart(e);
  }
};
