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
