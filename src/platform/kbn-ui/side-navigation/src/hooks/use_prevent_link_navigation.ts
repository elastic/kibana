/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

/**
 * Hook for preventing the default navigation behavior of a link.
 * Used in Jest tests and Storybook.
 */
export const usePreventLinkNavigation = () => {
  useEffect(() => {
    const handleClick = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest('a');

      if (anchor?.getAttribute('href')) {
        e.preventDefault();
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => document.removeEventListener('click', handleClick, true);
  }, []);
};
