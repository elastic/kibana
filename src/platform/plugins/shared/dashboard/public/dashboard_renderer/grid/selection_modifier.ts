/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMac } from '@kbn/shared-ux-utility';

type ModifierKeys = Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>;

/**
 * Returns true when the event carries a panel selection modifier: Shift, or Cmd on macOS / Ctrl elsewhere.
 * Ctrl on macOS and Meta on other platforms are deliberately ignored.
 */
export const isSelectionModifier = ({ shiftKey, metaKey, ctrlKey }: ModifierKeys): boolean =>
  shiftKey || (isMac ? metaKey : ctrlKey);
