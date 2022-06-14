/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Headers {
  readonly [key: string]: string[];
}

export interface HttpRequest {
  readonly headers?: Headers[];
  readonly method?: string;
  readonly body?: string;
}

export interface HttpResponse {
  readonly headers?: Headers[];
  readonly status_code?: number;
}

export interface Http {
  readonly request?: HttpRequest;
  readonly response?: HttpResponse;
}

export interface Trace {
  readonly '@timestamp': string;
  readonly transaction_id: string;
  readonly url_path: string;
  readonly url_base: string;
  readonly span_id?: string;
  readonly http?: Http;
  readonly children?: readonly Trace[];
}

export interface Transaction {
  readonly transactionName: string;
  readonly transactionType: string;
  readonly service: string;
  readonly traces: readonly Trace[];
}

export interface Request {
  readonly url: {
    readonly path: string;
  };
  readonly headers: Headers;
  readonly method: string;
  readonly body?: string;
}

export interface TransactionItem {
  readonly id: string;
  readonly name: string;
  readonly type: string;
}

export interface TraceItem {
  readonly traceId: string;
  readonly timestamp: string;
  readonly request: Request;
  readonly response: {
    readonly status: string;
  };
  readonly transaction: TransactionItem;
}

export interface Stage {
  readonly action: string;
  readonly minUsersCount?: number;
  readonly maxUsersCount: number;
  readonly duration: string;
}

export interface Setup {
  readonly warmup: { readonly stages: readonly Stage[] };
  readonly test: { readonly stages: readonly Stage[] };
  readonly maxDuration: string;
}

export interface Journey {
  readonly journeyName: string;
  readonly kibanaVersion: string;
  readonly scalabilitySetup: Setup;
  readonly traceItems: readonly TraceItem[];
}
