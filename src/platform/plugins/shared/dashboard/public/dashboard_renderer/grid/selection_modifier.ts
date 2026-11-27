/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMac } from '@kbn/shared-ux-utility';

type ModifierKeys = Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

/**
 * Returns true when the panel selection modifier (Cmd on macOS, Ctrl elsewhere) is the only modifier held.
 * Any other combination (e.g. Cmd+Shift for a map box zoom) belongs to the panel content.
 */
export const isSelectionModifier = ({
  metaKey,
  ctrlKey,
  shiftKey,
  altKey,
}: ModifierKeys): boolean =>
  !shiftKey && !altKey && (isMac ? metaKey && !ctrlKey : ctrlKey && !metaKey);
