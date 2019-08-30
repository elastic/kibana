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

const apmEnabled = process.env.APM_ENABLED === 'true';

export function apmImport() {
  return apmEnabled ? 'import { init } from "@elastic/apm-rum"' : '';
}

export function apmInit(config) {
  return apmEnabled ? `init(${config})` : '';
}

/**
 * TODO: Fetch it from central place
 * as Node.js agent
 */
export function getApmConfig(legacyMetadata) {
  /**
   * we use the injected metadata from the server to extract the
   * app URL path to be used for page-load transaction
   */
  const app = legacyMetadata.app;
  const navLink = app.getNavLink();
  const pageUrl = navLink ? navLink.toJSON().url : app._url;

  return {
    active: false,
    serviceName: 'kibana-frontend',
    serverUrl: 'http://localhost:8200',
    pageLoadTransactionName: pageUrl,
  };
}
