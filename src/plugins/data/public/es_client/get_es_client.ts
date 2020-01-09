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

// @ts-ignore
import { default as es } from 'elasticsearch-browser/elasticsearch';
import { CoreStart, PackageInfo } from 'kibana/public';

export function getEsClient(
  injectedMetadata: CoreStart['injectedMetadata'],
  http: CoreStart['http'],
  packageInfo: PackageInfo
) {
  const esRequestTimeout = injectedMetadata.getInjectedVar('esRequestTimeout') as number;
  const esApiVersion = injectedMetadata.getInjectedVar('esApiVersion') as string;

  // Use legacy es client for msearch.
  return es.Client({
    host: getEsUrl(http, packageInfo),
    log: 'info',
    requestTimeout: esRequestTimeout,
    apiVersion: esApiVersion,
  });
}

function getEsUrl(http: CoreStart['http'], packageInfo: PackageInfo) {
  const a = document.createElement('a');
  a.href = http.basePath.prepend('/elasticsearch');
  const protocolPort = /https/.test(a.protocol) ? 443 : 80;
  const port = a.port || protocolPort;
  return {
    host: a.hostname,
    port,
    protocol: a.protocol,
    pathname: a.pathname,
    headers: {
      'kbn-version': packageInfo.version,
    },
  };
}
