/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const isEditableKeyboardTarget = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const tagName = target.tagName?.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) return true;

  if (target.isContentEditable) return true;

  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'combobox' || role === 'searchbox') return true;

  return false;
};

export const isPrimaryModifier = (event: KeyboardEvent): boolean => {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return isMac ? event.metaKey : event.ctrlKey;
};
