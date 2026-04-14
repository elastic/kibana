/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isMac } from '@kbn/shared-ux-utility';

export function useKeyboardShortcut(key: string | undefined, callback: (() => void) | undefined) {
  useEffect(() => {
    if (!key || !callback) return;
    const target = key.toLowerCase();
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === target && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        callback();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback]);
}
