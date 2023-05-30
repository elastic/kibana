/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedDocViewerPlugin } from './plugin';

export { DocViewer, DocViewerSource, DocViewerTable, DocViewerTableLegacy } from './components';

export { useEsDocSearch, usePager, isNestedFieldParent } from '@kbn/unified-doc-viewer';

export function plugin() {
  return new UnifiedDocViewerPlugin();
}
