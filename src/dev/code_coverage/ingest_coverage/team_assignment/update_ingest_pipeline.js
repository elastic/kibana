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

import { createFailError } from '@kbn/dev-utils';
import { RESEARCH_CLUSTER_ES_HOST } from '../constants';
import { pretty, green } from '../utils';

const { Client } = require('@elastic/elasticsearch');

const node = RESEARCH_CLUSTER_ES_HOST;
const client = new Client({ node });

export const update = (id) => (log) => async (body) => {
  try {
    await client.ingest.putPipeline({ id, body });
    log.verbose(`### Ingestion Pipeline ID: ${green(id)}`);
    log.verbose(`### Payload Partial: \n${body.slice(0, 600)}...`);
  } catch (e) {
    throw createFailError(`${pretty(e.meta)}`);
  }
};
