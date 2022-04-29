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
import { always, id, flatMap, ccMark, noop } from './utils';

const node = process.env.ES_HOST || 'http://localhost:9200';
const client = new Client({
  node,
  maxRetries: 5,
  requestTimeout: 60000,
  Connection: HttpConnection,
});
const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;

const doPeek = process.env.COVERAGE_PEEK || false;

// Defaults to 4 because of the bulk json format
// A default of 2 would only give you one record
// because of the bulk format.
const peekSize = process.env.COVERAGE_PEEK_SIZE || 4;

const peek = (log) => (size) => (body) =>
  log.verbose(
    `\n${ccMark} Peeking at ${size} docs: \n${JSON.stringify(body.slice(0, size), null, 2)}`
  );

const bulkIngest = (log) => (count) => async (body) => {
  log.verbose(`\n${ccMark} Ingesting ${count} docs at a time`);

  doPeek ? peek(log)(peekSize)(body) : noop();

  const bulkResponse = await client.bulk({ refresh: true, body });

  handleErrors(body, bulkResponse)(log);
};

export const ingestList = (log) => async (xs) => await bulkIngest(log)(xs.length)(parseIndexes(xs));

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
