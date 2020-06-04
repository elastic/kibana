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
import { COVERAGE_INDEX, TOTALS_INDEX } from './constants';
import { logSuccess, errMsg, redact } from './ingest_helpers';

const node = process.env.ES_HOST || 'http://localhost:9200';
const redacted = redact(node);
const client = new Client({ node });

export const ingest = (log) => async (body) => {
  const index = body.isTotal ? TOTALS_INDEX : COVERAGE_INDEX;
  const sendIndex = send(index);

  process.env.NODE_ENV === 'integration_test'
    ? logSuccess(log, index, redacted, body)
    : await sendIndex(log, body);
};

function send(index) {
  return async (log, body) => {
    try {
      await client.index(request(index, body));
      logSuccess(log, index, redacted, body);
    } catch (e) {
      throw createFailError(errMsg(index, redacted, body, e));
    }
  };
}

export function request(index, body) {
  const pipeline = process.env.PIPELINE_NAME || 'team_assignment';
  return index.includes('total') ? body : { ...body, pipeline };
}
