/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { always, ccMark, flatMap, id, pretty } from './utils';
import chalk from 'chalk';
import { fromNullable, left, right } from './either';
import * as maybe from './maybe';
import {
  COVERAGE_INDEX,
  RESEARCH_CI_JOB_NAME,
  RESEARCH_COVERAGE_INDEX,
  RESEARCH_TOTALS_INDEX,
  TOTALS_INDEX,
} from './constants';
import { Task } from './task';
import { pluckIndex } from './transforms';

const { Client } = require('@elastic/elasticsearch');

const partial = (x) => x.split('\n').splice(0, 2).join('\n');

const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;

export function errMsg(index, redacted, body, e) {
  const orig = fromNullable(e.body).fold(
    always(''),
    () => `### Orig Err:\n${pretty(e.body.error)}`
  );

  const red = color('red');

  return `
### ES HOST (redacted): \n\t${red(redacted)}
### INDEX: \n\t${red(index)}
### Partial orig err stack: \n\t${partial(e.stack)}
### Item BODY:\n${pretty(body)}
${orig}

### Troubleshooting Hint:
${red('Perhaps the coverage data was not merged properly?\n')}

### Error.meta (stringified):
${pretty(e.meta)}
`;
}

export function redact(x) {
  const url = new URL(x);
  return url.password ? `${url.protocol}//${url.host}` : x;
}

function color(whichColor) {
  return function colorInner(x) {
    return chalk[whichColor].bgWhiteBright(x);
  };
}

export function whichIndex(isResearchJob) {
  return (isTotal) =>
    isTotal ? whichTotalsIndex(isResearchJob) : whichCoverageIndex(isResearchJob);
}

function whichTotalsIndex(isResearchJob) {
  return isResearchJob ? RESEARCH_TOTALS_INDEX : TOTALS_INDEX;
}

function whichCoverageIndex(isResearchJob) {
  return isResearchJob ? RESEARCH_COVERAGE_INDEX : COVERAGE_INDEX;
}

const node = process.env.ES_HOST || 'http://localhost:9200';
const client = new Client({ node });
export const bulkTask = Task.fromPromised(async (opts) => await client.bulk(opts));

export const isNodeEnvDeclared = (xs) => (process.env.NODE_ENV ? left(xs) : right(xs));

export const logLengthTap = (log) => (xs) => (body) => {
  log.verbose(`${ccMark} Ingesting ${xs.length} docs at a time`);
  return body;
};

const bulkOptions = (body) => ({ refresh: true, body });

const parseErrors = (log) => (bulkResponse) => (innerBody) => {
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

const handleErrors = (body, bulkResponse) => (log) =>
  fromNullable(bulkResponse.errors) // check errors for null
    .map(always(body)) // if errors is not null, pass the body to printErrors
    .fold(id, parseErrors(log)(bulkResponse));

const handleHttpError = (log) => (err) =>
  maybe
    .fromNullable(err)
    .map(pluckIndex('message'))
    .map((msg) => log.error(`${ccMark} ${msg}`));

const handleHttpSuccess = (body) => (log) => (bulkResponse) =>
  handleErrors(body, bulkResponse)(log);

export const bulkIngest = (log) => (body) =>
  bulkTask(bulkOptions(body)).fork(handleHttpError(log), handleHttpSuccess(body)(log));

export const justLog = (log) => (list) => {
  log.verbose(`\n${ccMark} Just logging first item from current (buffered) bulk list`);
  log.verbose(`\n${ccMark} ${JSON.stringify(list[0], null, 2)}`);
};

export const parseIndexes = (xs) =>
  flatMap((doc) => {
    const isTotal = !!doc.isTotal;
    const _index = whichIndex(isResearchJob)(isTotal);
    return [{ index: { _index } }, doc];
  })(xs);
