/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpecDetail, ConnectorSpecSummary } from '@kbn/actions-plugin/common';

/**
 * Single-spec detail returned by the browser GET. The HTTP GET omits `availability` and `skill`.
 */
export type BrowserConnectorSpecDetail = Omit<ConnectorSpecDetail, 'availability' | 'skill'>;

export interface BrowserGetSpecParams {
  id: string;
  signal?: AbortSignal;
}

export interface BrowserGetAllSpecsParams {
  featureId?: string;
  signal?: AbortSignal;
}

export interface SpecsClient {
  get(params: BrowserGetSpecParams): Promise<BrowserConnectorSpecDetail>;
  getAll(params?: BrowserGetAllSpecsParams): Promise<ConnectorSpecSummary[]>;
}
