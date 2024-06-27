/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getDocViewerTabs } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../../plugin';

export function getUnifiedDocViewerTabs({ docViewsRegistry, ...props }: DocViewRenderProps) {
  const { unifiedDocViewer } = getUnifiedDocViewerServices();

  let registry = unifiedDocViewer.registry;
  if (docViewsRegistry) {
    registry =
      typeof docViewsRegistry === 'function'
        ? docViewsRegistry(unifiedDocViewer.registry.clone())
        : docViewsRegistry;
  }

  return getDocViewerTabs({ docViews: registry.getAll(), ...props });
}
