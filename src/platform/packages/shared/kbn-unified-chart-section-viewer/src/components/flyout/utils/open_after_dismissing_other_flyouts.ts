/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dismissAllFlyoutsExceptFor, type DiscoverFlyouts } from '@kbn/discover-utils';

// Every flyout `dismissFlyouts` handles is reached through EUI's close button, so one left in the
// DOM means a flyout was dismissed but has not unmounted yet.
const OPEN_FLYOUT_SELECTOR = '[data-test-subj="euiFlyoutCloseButton"]';

/** Dismisses the other Discover flyouts, then opens this one once they have unmounted. */
export const openAfterDismissingOtherFlyouts = (
  excludedFlyout: DiscoverFlyouts,
  open: () => void
): void => {
  dismissAllFlyoutsExceptFor(excludedFlyout);

  if (document.querySelector(OPEN_FLYOUT_SELECTOR) === null) {
    open();
    return;
  }

  // Push flyouts share one inline offset on the app scroll container, which EUI captures on mount
  // and restores on unmount, so mounting on top of a closing flyout captures the outgoing offset.
  // The dismissed flyout unmounts on the next render; the second frame covers the system flyout
  // service, which clears a stranded offset on a frame of its own.
  requestAnimationFrame(() => requestAnimationFrame(open));
};
