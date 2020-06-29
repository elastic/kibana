/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { Client } = require('@elastic/elasticsearch');
import { createFailError } from '@kbn/dev-utils';
import { RESEARCH_CI_JOB_NAME, TEAM_ASSIGNMENT_PIPELINE_NAME } from './constants';
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
  const isACoverageIndex = isTotal ? false : true;

  const stringified = pretty(body);
  const pipeline = TEAM_ASSIGNMENT_PIPELINE_NAME;

  const finalPayload = isACoverageIndex
    ? { index, body: stringified, pipeline }
    : { index, body: stringified };

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
${process.env.NODE_ENV === 'integration_test' ? `ingest-pipe=>${payload.pipeline}` : ''}
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
