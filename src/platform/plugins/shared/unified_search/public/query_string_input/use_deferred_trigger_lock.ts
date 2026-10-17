/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

/**
 * Whether a popover trigger should be locked right now. The lock engages only once the popover is
 * closed, and one update after it closed, and releases immediately.
 *
 * EuiPopover sets `aria-expanded` on its trigger only while the trigger is focusable, so disabling
 * the trigger in the same update that closes the popover leaves a closed popover advertising
 * itself as expanded. An open popover is not locked, since the lock applies to starting a new
 * search from the trigger.
 */
export const useDeferredTriggerLock = (isLocked: boolean, isPopoverOpen: boolean): boolean => {
  const [isDeferredLock, setIsDeferredLock] = useState(isLocked && !isPopoverOpen);

  useEffect(() => {
    setIsDeferredLock(isLocked && !isPopoverOpen);
  }, [isLocked, isPopoverOpen]);

  return isLocked && isDeferredLock;
};
