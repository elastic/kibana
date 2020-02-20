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

import { getConfig, isKibanaDistributable } from '../../../apm';
import agent from 'elastic-apm-node';

const apmEnabled = !isKibanaDistributable && process.env.ELASTIC_APM_ACTIVE === 'true';

export function apmImport() {
  return apmEnabled ? 'import { init } from "@elastic/apm-rum"' : '';
}

export function apmInit(config) {
  return apmEnabled ? `init(${config})` : '';
}

export function getApmConfig(appMetadata) {
  if (!apmEnabled) {
    return {};
  }
  /**
   * we use the injected app metadata from the server to extract the
   * app URL path to be used for page-load transaction
   */
  const navLink = appMetadata.getNavLink();
  const pageUrl = navLink ? navLink.toJSON().url : appMetadata._url;

  const config = {
    ...getConfig('kibana-frontend'),
    ...{
      active: true,
      pageLoadTransactionName: pageUrl,
    },
  };
  /**
   * Get current active backend transaction to make distrubuted tracing
   * work for rendering the app
   */
  const backendTransaction = agent.currentTransaction;

  if (backendTransaction) {
    const { sampled, traceId } = backendTransaction;
    return {
      ...config,
      ...{
        pageLoadTraceId: traceId,
        pageLoadSampled: sampled,
        pageLoadSpanId: backendTransaction.ensureParentId(),
      },
    };
  }
  return config;
}
