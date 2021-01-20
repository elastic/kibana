/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { Client } = require('@elastic/elasticsearch');
import { createFailError } from '@kbn/dev-utils';
import { RESEARCH_CI_JOB_NAME } from './constants';
import { errMsg, redact, whichIndex } from './ingest_helpers';
import { pretty, green } from './utils';
import { right, left } from './either';

const node = process.env.ES_HOST || 'http://localhost:9200';

const client = new Client({ node });
const redactedEsHostUrl = redact(node);
const parse = JSON.parse.bind(null);
const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;

export const ingest = (log) => async (body) => {
  const isTotal = !!body.isTotal;
  const index = whichIndex(isResearchJob)(isTotal);

  const stringified = pretty(body);

  const finalPayload = { index, body: stringified };

  const justLog = dontSendButLog(log);
  const doSendToIndex = doSend(index);
  const doSendRedacted = doSendToIndex(redactedEsHostUrl)(log)(client);

  eitherSendOrNot(finalPayload).fold(justLog, doSendRedacted);
};

function doSend(index) {
  return (redactedEsHostUrl) => (log) => (client) => async (payload) => {
    const logF = logSend(true)(redactedEsHostUrl)(log);
    await send(logF, index, redactedEsHostUrl, client, payload);
  };
}

function dontSendButLog(log) {
  return (payload) => {
    logSend(false)(null)(log)(payload);
  };
}

async function send(logF, idx, redactedEsHostUrl, client, requestBody) {
  try {
    await client.index(requestBody);
    logF(requestBody);
  } catch (e) {
    const { body } = requestBody;
    const parsed = parse(body);
    throw createFailError(errMsg(idx, redactedEsHostUrl, parsed, e));
  }
}

const sendMsg = (actuallySent, redactedEsHostUrl, payload) => {
  const { index, body } = payload;
  return `### ${actuallySent ? 'Sent' : 'Fake Sent'}:
${redactedEsHostUrl ? `\t### ES Host: ${redactedEsHostUrl}` : ''}

\t### Index: ${green(index)}

\t### payload.body: ${body}
`;
};

function logSend(actuallySent) {
  return (redactedEsHostUrl) => (log) => (payload) => {
    log.verbose(sendMsg(actuallySent, redactedEsHostUrl, payload));
  };
}

function eitherSendOrNot(payload) {
  return process.env.NODE_ENV === 'integration_test' ? left(payload) : right(payload);
}
