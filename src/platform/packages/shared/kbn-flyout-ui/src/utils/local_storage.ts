/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns expanded section state from localStorage.
 */
export const getExpandedSectionFromLocalStorage = (storageKey: string): Record<string, boolean> => {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return {};
  const parsed = JSON.parse(raw) as Record<string, boolean>;
  return typeof parsed === 'object' && parsed !== null ? parsed : {};
};

/**
 * Writes expanded section state to localStorage.
 */
export const setExpandedSectionToLocalStorage = (
  storageKey: string,
  value: Record<string, boolean>
): void => {
  localStorage.setItem(storageKey, JSON.stringify(value));
};
