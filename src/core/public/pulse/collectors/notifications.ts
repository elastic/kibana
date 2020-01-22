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

export type Payload = Exclude<
  NotificationInstruction,
  'channel_id' | 'deployment_id' | 'timestamp'
>;

export interface NotificationInstruction {
  hash: string;
  timestamp: number;
  channel_id: string;
  deployment_id: string;
  title: string;
  status: 'new' | 'seen';
  description: string;
  linkUrl: string;
  linkText: string;
  badge: string;
  publishOn: string;
  expireOn: string;
  seenOn: string;
}

const records = new Map();

export async function putRecord(entry: Payload | Payload[]) {
  const payloads = Array.isArray(entry) ? entry : [entry];
  payloads.forEach(payload => {
    if (!payload.hash) {
      throw Error(`notification payload does not contain hash: ${JSON.stringify(payload)}.`);
    }
    records.set(payload.hash, {
      ...payload,
      channel_id: 'notifications',
      deployment_id: '123',
    });
  });
}

export async function getRecords() {
  return [...records.values()];
}

export async function clearRecords(ids: string[]) {
  for (const id of ids) {
    records.delete(id);
  }
}
