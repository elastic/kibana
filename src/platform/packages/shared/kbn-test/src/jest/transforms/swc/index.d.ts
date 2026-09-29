/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export = transformer;
export { prepareSource };
declare function prepareSource(
  sourceText: any,
  sourcePath: any
):
  | {
      code: any;
      hoistedModuleNames: Set<any>;
      soleDefaultExport: boolean;
      map?: undefined;
    }
  | {
      code: any;
      map: any;
      hoistedModuleNames: Set<any>;
      soleDefaultExport: boolean;
    };
declare const transformer: {
  canInstrument: boolean;
  process(
    sourceText: any,
    sourcePath: any,
    transformOptions: any
  ): {
    code: any;
    map: string;
  };
  processAsync(
    sourceText: any,
    sourcePath: any,
    transformOptions: any
  ): Promise<{
    code: any;
    map: string;
  }>;
  getCacheKey(sourceText: any, sourcePath: any, transformOptions: any): string;
};
