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

import Axios from 'axios';

const PLUGIN_STATUS_ID = /^plugin:(.+?)@/;
const isString = (v: any): v is string => typeof v === 'string';

/**
 * Get the list of enabled plugins from Kibana, used to determine which
 * uiExports to collect, whether we should clean or clean the kibana index,
 * and if we need to inject the default space document in new versions of
 * the index.
 *
 * This must be called before touching the Kibana index as Kibana becomes
 * unstable when the .kibana index is deleted/cleaned and the status API
 * will fail in situations where status.allowAnonymous=false and security
 * is enabled.
 */
export async function getEnabledKibanaPluginIds(kibanaUrl: string): Promise<string[]> {
  try {
    const { data } = await Axios.get('/api/status', {
      baseURL: kibanaUrl,
    });

    return (data.status.statuses as Array<{ id: string }>)
      .map(({ id }) => {
        const match = id.match(PLUGIN_STATUS_ID);
        if (match) {
          return match[1];
        }
      })
      .filter(isString);
  } catch (error) {
    throw new Error(
      `Unable to fetch Kibana status API response from Kibana at ${kibanaUrl}: ${error}`
    );
  }
}
