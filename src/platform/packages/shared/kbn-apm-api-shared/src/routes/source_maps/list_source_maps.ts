/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { defineRoute } from '../types';
import type { ApmSourceMapArtifactBody } from './source_map_types';

export interface ListSourceMapArtifactsResponse {
  artifacts: Array<{
    body: ApmSourceMapArtifactBody;
    id: string;
    created: string;
    compressionAlgorithm: 'none' | 'zlib';
    encryptionAlgorithm: 'none';
    decodedSha256: string;
    decodedSize: number;
    encodedSha256: string;
    encodedSize: number;
    identifier: string;
    packageName: string;
    relative_url: string;
    type?: string | undefined;
  }>;
  total: number;
}
export const listSourceMapsRoute = defineRoute<ListSourceMapArtifactsResponse | undefined>()({
  endpoint: 'GET /api/apm/sourcemaps 2023-10-31',
  params: t.partial({
    query: t.partial({
      page: toNumberRt,
      perPage: toNumberRt,
    }),
  }),
});
