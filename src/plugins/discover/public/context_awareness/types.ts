/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface DocViewerExtension {
  title: string | undefined;
  docViewsRegistry: (prevRegistry: DocViewsRegistry) => DocViewsRegistry;
}

export interface DocViewerExtensionParams {
  record: DataTableRecord;
}

export interface Profile {
  getCellRenderers: () => CustomCellRenderer;
  getDocViewer: (params: DocViewerExtensionParams) => DocViewerExtension;
}
