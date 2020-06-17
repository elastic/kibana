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
import { RESEARCH_CI_JOB_NAME } from './constants';
import { errMsg, redact, maybeTeamAssign, whichIndex } from './ingest_helpers';
import { pretty } from './utils';
import { right, left } from './either';

const node = process.env.ES_HOST || 'http://localhost:9200';

const client = new Client({ node });
const redacted = redact(node);

export const ingest = (log) => async (body) => {
  const isTotal = !!body.isTotal;
  const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;
  const index = whichIndex(isResearchJob)(isTotal);
  const isACoverageIndex = isTotal ? false : true;

  const payload = maybeTeamAssign(isACoverageIndex, body);

  const stringified = pretty(payload);
  const payloadWithIndex = { index, body: stringified };

  const justLog = dontSendButLog(log);
  const doSendToIndex = doSend(index);
  const doSendRedacted = doSendToIndex(redacted)(log);

  eitherSendOrNotAndParseForPrint(payloadWithIndex).fold(justLog, doSendRedacted);
};

async function send(idx, redacted, requestBody) {
  try {
    await client.index(requestBody);
  } catch (e) {
    const { body } = requestBody;
    const parsed = parse(body);
    throw createFailError(errMsg(idx, redacted, parsed, e));
  }
}

function doSend(index) {
  return (redacted) => (log) => async (payload) => {
    const { body } = payload;
    log.verbose(`\n### Sent: \n\t### Index: ${index}\n\t### payload.body: ${body}`);
    await send(index, redacted, payload);
  };
}

function dontSendButLog(log) {
  return (payload) => log.verbose(payload);
}

function eitherSendOrNotAndParseForPrint(payload) {
  const { body } = payload;
  const parsed = parse(body);
  return process.env.NODE_ENV === 'integration_test' ? left(parsed) : right(payload);
}

function parse(body) {
  return JSON.parse(body);
}
