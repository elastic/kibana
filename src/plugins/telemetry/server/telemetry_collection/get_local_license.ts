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

import { ESLicense, LicenseGetter } from 'src/plugins/telemetry_collection_manager/server';
import { ElasticsearchClient } from 'src/core/server';

let cachedLicense: ESLicense | undefined;

async function fetchLicense(esClient: ElasticsearchClient, local: boolean) {
  const { body } = await esClient.license.get({
    local,
    // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
    accept_enterprise: true,
  });
  return body;
}
/**
 * Get the cluster's license from the connected node.
 *
 * This is the equivalent of GET /_license?local=true&accept_enterprise=true.
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 *
 * In OSS we'll get a 400 response using the new elasticsearch client.
 */
async function getLicenseFromLocalOrMaster(esClient: ElasticsearchClient) {
  // Fetching the local license is cheaper than getting it from the master node and good enough
  const { license } = await fetchLicense(esClient, true).catch(async (err) => {
    if (cachedLicense) {
      try {
        // Fallback to the master node's license info
        const response = await fetchLicense(esClient, false);
        return response;
      } catch (masterError) {
        if ([400, 404].includes(masterError.statusCode)) {
          // If the master node does not have a license, we can assume there is no license
          cachedLicense = undefined;
        } else {
          throw err;
        }
      }
    }
    return { license: void 0 };
  });

  if (license) {
    cachedLicense = license;
  }
  return license;
}

export const getLocalLicense: LicenseGetter = async (clustersDetails, { esClient }) => {
  const license = await getLicenseFromLocalOrMaster(esClient);
  // It should be called only with 1 cluster element in the clustersDetails array, but doing reduce just in case.
  return clustersDetails.reduce((acc, { clusterUuid }) => ({ ...acc, [clusterUuid]: license }), {});
};
