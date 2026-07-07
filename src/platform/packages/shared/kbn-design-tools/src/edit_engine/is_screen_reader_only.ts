/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns true when the element has a screen-reader-only class name.
 * Handles both plain EUI classes (`euiScreenReaderOnly`) and
 * Emotion-generated variants (`css-<hash>-euiScreenReaderOnly`).
 *
 * @param el - The element to check.
 * @returns Whether the element is screen-reader-only.
 */
export const isScreenReaderOnly = (el: Element): boolean => {
  const cls = (el as HTMLElement)?.className;
  return typeof cls === 'string' && cls.includes('euiScreenReaderOnly');
};
