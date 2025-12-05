/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import type { IInterpreterRenderHandlers } from '../../common';

export interface SyncParamsState {
  syncColors: boolean;
  syncCursor: boolean;
  syncTooltips: boolean;
}

/**
 * React hook that subscribes to sync params updates from expression handlers.
 * Use this in chart renderers to efficiently update when sync params change without re-executing expressions.
 *
 * @param handlers - The interpreter render handlers passed to the render function
 * @returns Current sync params state that updates when params change
 */
export function useSyncParams(handlers: IInterpreterRenderHandlers): SyncParamsState {
  const [syncColors, setSyncColors] = useState(handlers.isSyncColorsEnabled());
  const [syncCursor, setSyncCursor] = useState(handlers.isSyncCursorEnabled());
  const [syncTooltips, setSyncTooltips] = useState(handlers.isSyncTooltipsEnabled());

  useEffect(() => {
    const subscription = handlers.syncParamsUpdate$?.subscribe((params) => {
      if (params.syncColors !== undefined) {
        setSyncColors(params.syncColors);
      }
      if (params.syncCursor !== undefined) {
        setSyncCursor(params.syncCursor);
      }
      if (params.syncTooltips !== undefined) {
        setSyncTooltips(params.syncTooltips);
      }
    });

    return () => subscription?.unsubscribe();
  }, [handlers.syncParamsUpdate$]);

  return {
    syncColors,
    syncCursor,
    syncTooltips,
  };
}
