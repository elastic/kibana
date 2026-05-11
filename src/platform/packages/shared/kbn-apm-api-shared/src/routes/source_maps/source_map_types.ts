/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';

export const sourceMapRt = t.intersection([
  t.type({
    version: t.number,
    sources: t.array(t.string),
    mappings: t.string,
  }),
  t.partial({
    names: t.array(t.string),
    file: t.string,
    sourceRoot: t.string,
    sourcesContent: t.array(t.union([t.string, t.null])),
  }),
]);

export type SourceMap = t.TypeOf<typeof sourceMapRt>;

export interface ApmSourceMapArtifactBody {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
  sourceMap: SourceMap;
}
