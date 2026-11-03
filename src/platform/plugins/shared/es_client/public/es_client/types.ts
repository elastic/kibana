/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transport, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type API from '@elastic/elasticsearch/lib/api/index';
import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';

type ApiMembers = Pick<API, Extract<keyof API, string>>;

/**
 * The elasticsearch-js API surface, sent through the Elasticsearch proxy. `transport` only
 * implements `request`.
 */
export type EsClient = Omit<ApiMembers, 'bulk'> & {
  readonly transport: Transport;
  bulk: <TDocument = unknown, TPartialDocument = Partial<TDocument>>(
    params: BulkRequest<TDocument, TPartialDocument>,
    options?: TransportRequestOptionsWithOutMeta
  ) => Promise<BulkResponse>;
};
