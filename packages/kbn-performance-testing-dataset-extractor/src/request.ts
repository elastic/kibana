/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ESClient, TransactionDocument, Headers, SpanDocument } from './es_client';
import { Request } from './types';

const httpMethodRegExp = /(GET|POST|DELETE|HEAD|PUT|OPTIONS)/;
const httpPathRegExp = /(?<=GET|POST|DELETE|HEAD|PUT|OPTIONS).*/;
const staticResourcesRegExp = /\.(css|ico|js|json|jpeg|jpg|gif|png|svg|otf|ttf|woff|woff2)$/;

const strToJSON = (str: string): JSON | undefined => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return;
  }
};

const findFirstMatch = (regExp: RegExp, testString: string) => {
  const found = regExp.exec(testString);
  return found ? found[0] : undefined;
};

const parseQueryStatement = (statement: string): { params?: string; body?: JSON } => {
  // github.com/elastic/apm-agent-nodejs/blob/5ba1b2609d18b12a64e1e559236717dd38d64a51/lib/instrumentation/elasticsearch-shared.js#L27-L29
  // Some ES endpoints support both query params and a body, statement string might contain both of it
  const split = statement.split('\n\n');
  if (split.length === 2) {
    return { params: split[0], body: strToJSON(split[1]) };
  } else {
    const body = strToJSON(split[0]);
    return body ? { body } : { params: split[0] };
  }
};

const combineHeaderFieldValues = (headers: Headers): { [key: string]: string } => {
  return Object.assign(
    {},
    ...Object.keys(headers).map((key) => ({ [key]: headers[key].join(', ') }))
  );
};

export const getKibanaRequests = (
  hits: Array<SearchHit<TransactionDocument>>,
  withoutStaticResources: boolean
): Request[] => {
  const data = hits
    .map((hit) => hit!._source as TransactionDocument)
    .map((hit) => {
      const payload = hit.http.request?.body?.original;
      return {
        transactionId: hit.transaction.id,
        name: hit.transaction.name,
        date: hit['@timestamp'],
        duration: hit.transaction.duration.us,
        http: {
          method: hit.http.request.method,
          path: hit.url.path,
          query: hit.url?.query,
          headers: combineHeaderFieldValues(hit.http.request.headers),
          body: payload ? JSON.stringify(strToJSON(payload)) : undefined,
          statusCode: hit.http.response.status_code,
        },
        spanCount: hit.transaction.span_count.started,
      };
    });

  return withoutStaticResources
    ? data.filter((item) => !staticResourcesRegExp.test(item.http.path))
    : data;
};

export const getESRequests = async (esClient: ESClient, requests: Request[]) => {
  const esRequests = new Array<Request>();
  const transactionIds = requests
    .filter((r) => r.spanCount && r?.spanCount > 0)
    .map((r) => r.transactionId);
  const hits = await esClient.getSpans(transactionIds);
  for (const hit of hits.map((i) => i!._source as SpanDocument)) {
    const query = hit?.span?.db?.statement ? parseQueryStatement(hit?.span?.db?.statement) : {};
    const method = findFirstMatch(httpMethodRegExp, hit.span.name);
    const path = findFirstMatch(httpPathRegExp, hit.span.name.replace(/\s+/g, ''));
    // filter out requests without method, path and POST/PUT/DELETE without body
    if (method && path && (method === 'GET' || query?.body)) {
      esRequests.push({
        transactionId: hit.transaction.id,
        spanId: hit.span.id,
        name: hit.span.name,
        date: hit['@timestamp'],
        duration: hit.span?.duration?.us,
        http: {
          method,
          path,
          params: query?.params,
          body: query?.body,
        },
      });
    }
  }
  return esRequests;
};
