/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  GetIn,
  BulkGetIn,
  CreateIn,
  UpdateIn,
  DeleteIn,
  SearchIn,
  MSearchIn,
  MSearchResult,
} from '../../common';
import type { CrudClient } from '../crud_client/crud_client';
export declare class RpcClient implements CrudClient {
  private http;
  constructor(http: { post: HttpSetup['post'] });
  get<I extends GetIn = GetIn, O = unknown, M = unknown>(
    input: I
  ): Promise<import('../../common/rpc/types').ItemResult<O, M>>;
  bulkGet<I extends BulkGetIn = BulkGetIn, O = unknown, M = unknown>(
    input: I
  ): Promise<{
    hits: import('../../common/rpc/types').ItemResult<O, M>[];
  }>;
  create<I extends CreateIn = CreateIn, O = unknown, M = unknown>(
    input: I
  ): Promise<import('../../common/rpc/types').ItemResult<O, M>>;
  update<I extends UpdateIn = UpdateIn, O = unknown, M = unknown>(
    input: I
  ): Promise<import('../../common/rpc/types').ItemResult<O, M>>;
  delete<I extends DeleteIn = DeleteIn>(input: I): Promise<import('../../common').DeleteResult>;
  search<I extends SearchIn = SearchIn, O = unknown>(
    input: I
  ): Promise<{
    hits: O[];
    pagination: {
      total: number;
      cursor?: string;
    };
  }>;
  mSearch<T = unknown>(input: MSearchIn): Promise<MSearchResult<T>>;
  private sendMessage;
}
