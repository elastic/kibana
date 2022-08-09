/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ToolingLog } from '@kbn/tooling-log';
import { TransactionDocument, Headers } from './es_client';

const staticResourcesRegExp = /\.(css|ico|js|json|jpeg|jpg|gif|png|otf|ttf|woff|woff2)$/;

export interface KibanaRequest {
  traceId: string;
  parentId?: string;
  processor: string;
  environment: string;
  request: {
    timestamp: string;
    method: string;
    path: string;
    headers: { [key: string]: string };
    body?: string;
    statusCode: number;
  };
  transaction: {
    id: string;
    name: string;
    type: string;
  };
}

const parsePayload = (payload: string, traceId: string, log: ToolingLog): string | undefined => {
  let body;
  try {
    body = JSON.parse(payload);
  } catch (error) {
    log.error(`Failed to parse payload - trace_id: '${traceId}'`);
  }
  return body;
};

const combineHeaderFieldValues = (headers: Headers): { [key: string]: string } => {
  return Object.assign(
    {},
    ...Object.keys(headers).map((key) => ({ [key]: headers[key].join(', ') }))
  );
};

export const getRequests = (
  hits: Array<SearchHit<TransactionDocument>>,
  withoutStaticResources: boolean,
  log: ToolingLog
): KibanaRequest[] => {
  const data = hits
    .map((hit) => hit!._source as TransactionDocument)
    .map((hit) => {
      const payload = hit.http.request?.body?.original;
      return {
        traceId: hit.trace.id,
        parentId: hit?.parent?.id,
        processor: hit.processor,
        environment: hit.service.environment,
        request: {
          timestamp: hit['@timestamp'],
          method: hit.http.request.method,
          path: hit.url.path,
          headers: combineHeaderFieldValues(hit.http.request.headers),
          body: payload ? JSON.stringify(parsePayload(payload, hit.trace.id, log)) : undefined,
          statusCode: hit.http.response.status_code,
        },
        transaction: {
          id: hit.transaction.id,
          name: hit.transaction.name,
          type: hit.transaction.type,
        },
      };
    });

  return withoutStaticResources
    ? data.filter((item) => !staticResourcesRegExp.test(item.request.path))
    : data;
};
