/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESClient, ESQueryDocument } from './es_client';
import { KibanaRequest } from './server_request';

const httpMethodRegExp = /(GET|POST|DELETE|HEAD|PUT|OPTIONS)/;
const httpPathRegExp = /(?<=GET|POST|DELETE|HEAD|PUT|OPTIONS).*/;

interface ESQuery {
  id: string;
  transactionId: string;
  name: string;
  action: string;
  request: {
    method?: string;
    path?: string;
    params?: string;
    body?: JSON;
  };
  date: string;
  duration: number;
}

interface Stream {
  startTime: number;
  endTime: number;
  queries: ESQuery[];
}

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

export const fetchQueries = async (esClient: ESClient, transactions: KibanaRequest[]) => {
  const esQueries = new Array<ESQuery>();
  for (let i = 0; i < transactions.length; i++) {
    const transactionId = transactions[i].transaction.id;
    const esHits = await esClient.getSpans(transactionId);
    const spans = esHits
      .map((hit) => hit!._source as ESQueryDocument)
      .map((hit) => {
        const query = hit?.span.db?.statement ? parseQueryStatement(hit?.span.db?.statement) : {};
        return {
          id: hit.span.id,
          transactionId: hit.transaction.id,
          name: hit.span.name,
          action: hit.span?.action,
          request: {
            method: findFirstMatch(httpMethodRegExp, hit.span.name),
            path: findFirstMatch(httpPathRegExp, hit.span.name.replace(/\s+/g, '')),
            params: query?.params,
            body: query?.body,
          },
          date: hit['@timestamp'],
          duration: hit.span?.duration?.us,
        };
      })
      // filter out queries without method, path and POST/PUT/DELETE without body
      .filter(
        (hit) =>
          hit &&
          hit.request?.method &&
          hit.request?.path &&
          (hit.request?.method === 'GET' || hit.request?.body)
      );
    esQueries.push(...spans);
  }
  return esQueries;
};

export const queriesToStreams = (esQueries: ESQuery[]) => {
  const sorted = esQueries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const streams = new Map<string, Stream>();

  for (const query of sorted) {
    const startTime = new Date(query.date).getTime();
    const endTime = new Date(query.date).getTime() + query.duration / 1000;
    // searching if query starts before any existing stream ended
    const match = Array.from(streams.keys()).filter((key) => {
      const streamEndTime = streams.get(key)?.endTime;
      return streamEndTime ? startTime < streamEndTime : false;
    });
    const stream = streams.get(match[0]);
    if (stream) {
      // adding query to the existing stream
      stream.queries.push(query);
      // updating the stream endTime if needed
      if (endTime > stream.endTime) {
        stream.endTime = endTime;
      }
      // saving updated stream
      streams.set(match[0], stream);
    } else {
      // add a new stream
      streams.set(query.date, {
        startTime,
        endTime,
        queries: [query],
      });
    }
  }

  const values = Array.from(streams.values());
  return values.map((stream) => {
    return {
      startTime: new Date(stream.startTime).toISOString(),
      endTime: new Date(stream.endTime).toISOString(),
      queries: stream.queries,
    };
  });
};
