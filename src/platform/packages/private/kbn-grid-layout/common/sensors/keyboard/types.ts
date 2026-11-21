/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum KeyboardCode {
  Space = 'Space',
  Down = 'ArrowDown',
  Right = 'ArrowRight',
  Left = 'ArrowLeft',
  Up = 'ArrowUp',
  Esc = 'Escape',
  Enter = 'Enter',
  Tab = 'Tab',
}

export interface KeyboardCodes {
  start: Array<KeyboardEvent['code']>;
  cancel: Array<KeyboardEvent['code']>;
  end: Array<KeyboardEvent['code']>;
  move: Array<KeyboardEvent['code']>;
}

export type UserKeyboardEvent = KeyboardEvent | React.KeyboardEvent<HTMLButtonElement>;
