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

import { LegacyAPICaller } from 'kibana/server';
import { ESLicense, LicenseGetter } from 'src/plugins/telemetry_collection_manager/server';

let cachedLicense: ESLicense | undefined;

function fetchLicense(callCluster: LegacyAPICaller, local: boolean) {
  return callCluster<{ license: ESLicense }>('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local,
      // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
      accept_enterprise: 'true',
    },
  });
}

/**
 * Get the cluster's license from the connected node.
 *
 * This is the equivalent of GET /_license?local=true .
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 */
async function getLicenseFromLocalOrMaster(callCluster: LegacyAPICaller) {
  // Fetching the local license is cheaper than getting it from the master and good enough
  const { license } = await fetchLicense(callCluster, true).catch(async (err) => {
    if (cachedLicense) {
      try {
        // Fallback to the master node's license info
        const response = await fetchLicense(callCluster, false);
        return response;
      } catch (masterError) {
        if (masterError.statusCode === 404) {
          // If the master node does not have a license, we can assume there is no license
          cachedLicense = undefined;
        } else {
          // Any other errors from the master node, throw and do not send any telemetry
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

export const getLocalLicense: LicenseGetter = async (clustersDetails, { callCluster }) => {
  const license = await getLicenseFromLocalOrMaster(callCluster);

  // It should be called only with 1 cluster element in the clustersDetails array, but doing reduce just in case.
  return clustersDetails.reduce((acc, { clusterUuid }) => ({ ...acc, [clusterUuid]: license }), {});
};
