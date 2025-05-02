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

const handleStart = (e: UserKeyboardEvent, onStart: EventHandler, onBlur?: EventHandler) => {
  e.stopPropagation();
  e.preventDefault();
  onStart(e);
  disableScroll();

  const handleBlur = (blurEvent: Event) => {
    onBlur?.(blurEvent as UserInteractionEvent);
    enableScroll();
  };

  e.target?.addEventListener('blur', handleBlur, { once: true });
};

const handleMove = (e: UserKeyboardEvent, onMove: EventHandler) => {
  e.stopPropagation();
  e.preventDefault();
  onMove(e);
};

const handleEnd = (e: UserKeyboardEvent, onEnd: EventHandler, shouldScrollToEnd: boolean) => {
  e.preventDefault();
  enableScroll();
  onEnd(e);
};

const handleCancel = (e: UserKeyboardEvent, onCancel: EventHandler, shouldScrollToEnd: boolean) => {
  enableScroll();
  onCancel(e);
};

export const startKeyboardInteraction = ({
  e,
  isEventActive,
  onStart,
  onMove,
  onEnd,
  onCancel,
  onBlur,
  shouldScrollToEnd = false,
}: {
  e: UserKeyboardEvent;
  isEventActive: boolean;
  shouldScrollToEnd?: boolean;
  onMove: EventHandler;
  onStart: EventHandler;
  onEnd: EventHandler;
  onCancel: EventHandler;
  onBlur?: EventHandler;
}) => {
  if (!isEventActive) {
    if (isStartKey(e)) handleStart(e, onStart, onBlur);
    return;
  }
  if (isMoveKey(e)) handleMove(e, onMove);
  if (isEndKey(e)) handleEnd(e, onEnd, shouldScrollToEnd);
  if (isCancelKey(e)) handleCancel(e, onCancel, shouldScrollToEnd);
};
