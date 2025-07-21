/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ResolveFilePath } from '../common/types';
import { FileParseTransformResult } from '../file_parser/types';
import { TransformResult } from '../transformer_cache_provider/types';

export type ItemName = 'default' | '*' | string | null;

export type ImportExportEdge = ImportEdge | ExportEdge;

// import './module'; = null
// import * from './module'; = '*'
// import foo from './module'; = 'default';
// import { foo } from './module'; = 'foo';
export interface Import {
  path: string;
  name: ItemName;
}

// export * from './module'; = '*'
// export foo from './module'; = 'foo';
// export { foo } from './module'; = 'foo';
// export * as foo from './module'; = 'foo';
// export default foo; = 'default';
export interface Export {
  name: Exclude<ItemName, null>;
}

export interface ImportEdge {
  local: ItemName;
  import: Import;
}

export interface ExportEdge {
  local: ItemName;
  import?: Import;
  export: {
    name: Exclude<ItemName, null>;
  };
}

export interface EdgeExtractorTransformResult extends TransformResult {
  edges: ImportExportEdge[];
  exportsByName: Map<ItemName, ExportEdge>;
  unnamedNamespaceExports: string[];
  importsByLocal: Map<ItemName, ImportEdge>;
}

export interface EdgeExtractorTransformOptions {
  getFileParseResult: (filePath: string) => FileParseTransformResult | null;
  resolve: ResolveFilePath;
  shouldIgnore: (filePath: string) => boolean;
}
