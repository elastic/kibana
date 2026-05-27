/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface OverlayZIndex {
  clone: number;
  overlay: number;
  highlight: number;
  label: number;
  flyout: number;
  popover: number;
  modal: number;
}

/**
 * Returns a memoized z-index map for all overlay layers.
 * All values are derived from `euiTheme.levels.toast` as the base.
 */
export const useOverlayZIndex = (): OverlayZIndex => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const base = Number(euiTheme.levels.toast);
    return {
      clone: base + 1,
      overlay: base + 2,
      highlight: base + 3,
      label: base + 4,
      flyout: base + 5,
      popover: base + 6,
      modal: base + 7,
    };
  }, [euiTheme.levels.toast]);
};
