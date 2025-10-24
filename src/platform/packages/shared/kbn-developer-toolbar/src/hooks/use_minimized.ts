/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'kbn_developer_toolbar_minimized';

export const useMinimized = () => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const toggleMinimized = useCallback(() => {
    setIsMinimized((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch {
        // Silently fail if localStorage is unavailable
      }
      return newValue;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isMinimized));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [isMinimized]);

  return {
    isMinimized,
    toggleMinimized,
  };
};
