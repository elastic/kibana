/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DocViewer } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../plugin';

export function UnifiedDocViewer({ docViewsRegistry, ...props }: DocViewRenderProps) {
  const { unifiedDocViewer } = getUnifiedDocViewerServices();

  const registry = useMemo(() => {
    if (docViewsRegistry) {
      return typeof docViewsRegistry === 'function'
        ? docViewsRegistry(unifiedDocViewer.registry.clone())
        : docViewsRegistry;
    }
    return unifiedDocViewer.registry;
  }, [docViewsRegistry, unifiedDocViewer.registry]);

  return <DocViewer docViews={registry.getAll()} {...props} />;
}
