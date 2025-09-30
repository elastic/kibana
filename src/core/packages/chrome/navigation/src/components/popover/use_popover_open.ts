/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';

/**
 * Flag for tracking if any popover is open.
 */
let anyPopoverOpen: boolean = false;

/**
 * Utility function to check if any popover is open.
 *
 * @returns true if any popover is open
 */
export const getIsAnyPopoverOpenNow = () => anyPopoverOpen;

/**
 * Hook for managing popover open state
 */
export const usePopoverOpen = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
    anyPopoverOpen = true;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    anyPopoverOpen = false;
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
};
