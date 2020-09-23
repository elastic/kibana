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

/**
 * Get the cluster's license from the connected node.
 *
 * This is the equivalent of GET /_license?local=true&accept_enterprise=true .
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 *
 * In OSS we'll get a 400 response using the nwe client and need to catch that error too
 */
async function getLicenseFromLocalOrMaster(esClient: ElasticsearchClient) {
  let response;
  try {
    // TODO: extract the call into it's own function that accepts the flag for local
    // Fetching the license from the local node is cheaper than getting it from the master node and good enough
    const { body } = await esClient.license.get<{ license: ESLicense }>({
      local: true,
      accept_enterprise: true,
    });
    cachedLicense = body.license;
    response = body.license;
  } catch (err) {
    // if there is an error, try to get the license from the master node:
    if (cachedLicense) {
      try {
        const { body } = await esClient.license.get<{ license: ESLicense }>({
          local: false,
          accept_enterprise: true,
        });
        cachedLicense = body.license;
        response = body.license;
      } catch (masterError) {
        if ([400, 404].includes(masterError.statusCode)) {
          // the master node doesn't have a license and we assume there isn't a license
          cachedLicense = undefined;
          response = undefined;
        } else {
          throw err;
        }
      }
    }
    if ([400, 404].includes(err.statusCode)) {
      cachedLicense = undefined;
    } else {
      throw err;
    }
  }
  return response;
}

export const getLocalLicense: LicenseGetter = async (clustersDetails, { esClient }) => {
  const license = await getLicenseFromLocalOrMaster(esClient);
  // It should be called only with 1 cluster element in the clustersDetails array, but doing reduce just in case.
  return clustersDetails.reduce((acc, { clusterUuid }) => ({ ...acc, [clusterUuid]: license }), {});
};
