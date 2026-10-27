/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const isMacPlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? '');

/** Whether the panel selection modifier is held: Cmd on macOS (Ctrl + click opens the context menu there), Ctrl elsewhere. */
export const isSelectionModifierPressed = ({
  metaKey,
  ctrlKey,
}: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>): boolean => (isMacPlatform() ? metaKey : ctrlKey);
