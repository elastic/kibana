/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const isDot = (event: KeyboardEvent): boolean => event.code === 'Period' || event.key === '.';

/**
 * Check if Escape key was pressed.
 */
export const isEscapeKey = (event: KeyboardEvent): boolean => event.key === 'Escape';

/**
 * Check if Delete or Backspace key was pressed.
 */
export const isDeleteKey = (event: KeyboardEvent): boolean =>
  event.key === 'Delete' || event.key === 'Backspace';

/**
 * Check if the keyboard event corresponds to the measure shortcut (Meta/Ctrl + .).
 */
export const isMeasureShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isDot(event);

/**
 * Check if the keyboard event corresponds to the duplicate shortcut (Meta/Ctrl + D).
 */
export const isDuplicateShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.key === 'c';

/**
 * Check if Enter was pressed without modifiers to open the edit modal.
 */
export const isEditShortcut = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * Check if the keyboard event corresponds to the undo shortcut (Meta/Ctrl + Z, no Shift).
 */
export const isUndoShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey;

/**
 * Check if the keyboard event corresponds to the redo shortcut (Meta/Ctrl + Shift + Z).
 */
export const isRedoShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey;
