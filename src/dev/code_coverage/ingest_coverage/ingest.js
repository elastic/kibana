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
import {
  // COVERAGE_INDEX,
  // TOTALS_INDEX,
  RESEARCH_CI_JOB_NAME,
  // TEAM_ASSIGNMENT_PIPELINE_NAME,
  // RESEARCH_TOTALS_INDEX,
  // RESEARCH_COVERAGE_INDEX,
} from './constants';
import { errMsg, redact, maybeTeamAssign, whichIndex } from './ingest_helpers';
import { noop } from './utils';
import { right, left } from './either';

const node = process.env.ES_HOST || 'http://localhost:9200';

const client = new Client({ node });
const redacted = redact(node);

export const ingest = (log) => async (body) => {
  const isTotal = !!body.isTotal;
  const isResearchJob = process.env.COVERAGE_JOB_NAME === RESEARCH_CI_JOB_NAME ? true : false;
  const index = whichIndex(isResearchJob)(isTotal);
  const isACoverageIndex = isTotal ? false : true;

  const maybeWithPipeline = maybeTeamAssign(isACoverageIndex, body);
  const withIndex = { index, body: maybeWithPipeline };
  const dontSend = noop;

  log.verbose(withIndex);

  process.env.NODE_ENV === 'integration_test'
    ? left(null)
    : right(withIndex).fold(dontSend, async function doSend(finalPayload) {
        await send(index, redacted, finalPayload);
      });
};

async function send(idx, redacted, requestBody) {
  try {
    await client.index(requestBody);
  } catch (e) {
    throw createFailError(errMsg(idx, redacted, requestBody, e));
  }
}
