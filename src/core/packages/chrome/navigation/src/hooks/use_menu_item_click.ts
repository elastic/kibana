/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';

/**
 * Custom hook for handling menu item clicks with CMD + Click support
 *
 * @param onClick - Optional callback function to execute on regular clicks
 * @returns Click handler that supports CMD + Click to open in new tab
 */
export const useMenuItemClick = (onClick?: () => void) => {
  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Check for CMD + Click (Mac) or Ctrl + Click (Windows/Linux)
      // Let the browser handle these cases naturally for new tab opening
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      // Only prevent default for regular clicks
      event.preventDefault();
      onClick?.();
    },
    [onClick]
  );
};
