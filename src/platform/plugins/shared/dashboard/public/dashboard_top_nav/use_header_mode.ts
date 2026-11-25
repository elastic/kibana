/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';

export type HeaderMode = 'embedded' | 'legacy' | 'registered' | 'inline';

/**
 * Header rendering mode:
 *  - `embedded`: URL embed (`embed=true`), any chrome style. Chrome is hidden, so render the app menu
 *    inline, and only when `show-top-menu=true` forces it visible.
 *  - `legacy`: classic chrome -> push through the imperative chrome APIs.
 *  - `registered`: next chrome, hosted by an app that owns the layout and provides its own header slot
 *    (e.g. Security) -> register the content so chrome renders it in the app-header slot.
 *  - `inline`: next chrome, standalone -> we render `AppHeader`.
 */
export const useHeaderMode = ({
  isEmbeddedViaUrl,
  isHostedByApp,
}: {
  /** The page was loaded with the `embed=true` URL param. */
  isEmbeddedViaUrl: boolean;
  /** A host app provided `setCustomHeaderActionMenu`. */
  isHostedByApp: boolean;
}): HeaderMode => {
  const chromeStyle = useChromeStyle();

  if (isEmbeddedViaUrl) return 'embedded';
  if (chromeStyle !== 'project') return 'legacy';
  if (isHostedByApp) return 'registered';
  return 'inline';
};
