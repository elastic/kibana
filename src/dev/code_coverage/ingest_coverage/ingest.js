/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { Client, HttpConnection } = require('@elastic/elasticsearch');
import { RESEARCH_CI_JOB_NAME } from './constants';
import { whichIndex } from './ingest_helpers';
import { fromNullable } from './either';
import { always, id, flatMap, ccMark, lazyF } from './utils';

const node = process.env.ES_HOST || 'http://localhost:9200';
const client = new Client({
  node,
  maxRetries: 5,
  requestTimeout: 60000,
  Connection: HttpConnection,
});
const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;

export const ingestList = (log) => async (xs) => {
  await bulkIngest();

  async function bulkIngest() {
    log.verbose(`\n${ccMark} Ingesting ${xs.length} docs at a time`);

    const body = parseIndexes(xs);

    const bulkResponse = await client.bulk({ refresh: true, body });

    handleErrors(body, bulkResponse)(log);
  }
};

function handleErrors(body, bulkResponse) {
  return (log) =>
    fromNullable(bulkResponse.errors) // check errors for null
      .map(always(body)) // if errors is not null, pass the body to printErrors
      .fold(id, parseErrors(log)(bulkResponse));
}

function parseErrors(log) {
  return (bulkResponse) => (innerBody) => {
    const erroredDocuments = [];
    // The items array has the same order of the dataset we just indexed.
    // The presence of the `error` key indicates that the operation
    // that we did for the document has failed.
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0];

      if (action[operation].error) {
        erroredDocuments.push({
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          status: action[operation].status,
          error: action[operation].error,
          operation: innerBody[i * 2],
          document: innerBody[i * 2 + 1],
        });
        log.error(`${ccMark} ${JSON.stringify(erroredDocuments, null, 2)}`);
      }
    });
  };
}

function parseIndexes(xs) {
  return flatMap((doc) => {
    const isTotal = !!doc.isTotal;
    const _index = whichIndex(isResearchJob)(isTotal);
    return [{ index: { _index } }, doc];
  })(xs);
}

export const ingestHelpers$ = (log) => async (dataStream) => {
  fromNullable(process.env.NODE_ENV).fold(lazyF(ingestStream(log)(dataStream), id));

  function ingestStream(log) {
    return async (data$) => {
      // See: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-helpers.html
      const result = await client.helpers.bulk({
        datasource: data$,
        // flushInterval: 20000,
        // concurrency: 6,
        onDocument: (doc) => ({
          index: { _index: whichIndex(isResearchJob)(!!doc.isTotal) },
        }),
        onDrop(doc) {
          log.error(`${ccMark} ${JSON.stringify(doc, null, 2)} was dropped`);
        },
      });

      log.verbose(JSON.stringify(result, null, 2));
    };
  }
};
