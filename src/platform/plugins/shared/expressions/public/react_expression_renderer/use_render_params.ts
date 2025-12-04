/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import type { IInterpreterRenderHandlers, RenderMode } from '../../common';

export interface RenderParamsState {
  renderMode: RenderMode;
  syncColors: boolean;
  syncCursor: boolean;
  syncTooltips: boolean;
}

/**
 * React hook that subscribes to render params updates from expression handlers.
 * Use this in chart renderers to efficiently update when params change without re-executing expressions.
 *
 * @param handlers - The interpreter render handlers passed to the render function
 * @returns Current render params state that updates when params change
 */
export function useRenderParams(handlers: IInterpreterRenderHandlers): RenderParamsState {
  const [renderMode, setRenderMode] = useState(handlers.getRenderMode());
  const [syncColors, setSyncColors] = useState(handlers.isSyncColorsEnabled());
  const [syncCursor, setSyncCursor] = useState(handlers.isSyncCursorEnabled());
  const [syncTooltips, setSyncTooltips] = useState(handlers.isSyncTooltipsEnabled());

  useEffect(() => {
    const subscription = handlers.renderParamsUpdate$.subscribe((params) => {
      if (params.renderMode) {
        setRenderMode(params.renderMode);
      }
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

    return () => subscription.unsubscribe();
  }, [handlers.renderParamsUpdate$]);

  return {
    renderMode,
    syncColors,
    syncCursor,
    syncTooltips,
  };
}
