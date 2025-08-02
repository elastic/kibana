/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefObject } from 'react';

/**
 * Utility function for focus blur handling in the popover component.
 */
export const blurPopover =
  (triggerRef: RefObject<HTMLElement>, popoverRef: RefObject<HTMLElement>, onClose: () => void) =>
  (e: React.FocusEvent) => {
    const nextFocused = e.relatedTarget as Node;
    const isStayingInComponent =
      nextFocused &&
      (triggerRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused));

    if (!isStayingInComponent) {
      onClose();
    }
  };
