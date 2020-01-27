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

export const CLUSTER_UUID = '123';
export const BASE_URL = 'http://localhost:5601/api/pulse_poc';
export interface ChannelsToSend {
  records: any;
  channel_id: string;
}

export interface IPulseChannel {
  id: string;
  getRecords: <T>() => Promise<T[]>;
}

export const sendUsageFrom: 'browser' | 'server' = 'server';

export type Fetcher<Response> = (
  url: string,
  channelsToSend: ChannelsToSend[]
) => Promise<Response>;

export async function sendPulse<Response>(
  channels: Map<string, IPulseChannel>,
  fetcher: Fetcher<Response>
) {
  const url = `${BASE_URL}/intake/${CLUSTER_UUID}`;

  const channelsToSend = [];
  for (const channel of channels.values()) {
    const records = await channel.getRecords();
    // if (!records || !records.length) {
    //   return;
    // }
    channelsToSend.push({
      records,
      channel_id: channel.id,
    });
  }

  let response: any;
  try {
    response = await fetcher(url, channelsToSend);
  } catch (err) {
    if (!err.message.includes('ECONNREFUSED')) {
      throw err;
    }
    // the instructions polling should handle logging for this case, yay for POCs
    return;
  }
  if (response.status === 503) {
    // the instructions polling should handle logging for this case, yay for POCs
    return;
  }
  if (response.status !== 200) {
    const responseBody = await response.text();
    throw new Error(`${response.status}: ${responseBody}`);
  }
}
