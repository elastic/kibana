/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import type { AccessorConfig } from './types';

export function PaletteIndicator({ accessorConfig }: { accessorConfig: AccessorConfig }) {
  if (accessorConfig.triggerIconType !== 'colorBy' || !accessorConfig.palette) return null;
  return (
    <div className="lnsLayerPanel__paletteContainer">
      <EuiColorPaletteDisplay
        className="lnsLayerPanel__palette"
        size="xs"
        palette={accessorConfig.palette}
      />
    </div>
  );
}
