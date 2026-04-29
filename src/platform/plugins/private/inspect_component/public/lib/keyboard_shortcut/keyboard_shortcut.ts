/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Check if single quote was pressed.
 * @param {KeyboardEvent} event The keyboard event.
 * @return {boolean} 'true' if the keyboard shortcut is pressed, 'false' otherwise.
 */
const isSingleQuote = (event: KeyboardEvent): boolean =>
  event.code === 'Quote' || event.key === "'";

/**
 * Check if the keyboard event corresponds to the defined keyboard shortcut (Meta/Ctrl + ').
 * @param {KeyboardEvent} event The keyboard event.
 * @return {boolean} 'true' if the keyboard shortcut is pressed, 'false' otherwise.
 */
export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);

/**
 * Check if Escape key was pressed.
 * @return {boolean} 'true' if Escape key was pressed, 'false' otherwise.
 */
export const isEscapeKey = (event: KeyboardEvent): boolean => event.key === 'Escape';
