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
import { BehaviorSubject } from 'rxjs';

export function getEsClient({
  esRequestTimeout,
  esApiVersion,
  http,
  packageVersion,
}: {
  esRequestTimeout: number;
  esApiVersion: string;
  http: CoreStart['http'];
  packageVersion: PackageInfo['version'];
}) {
  // Use legacy es client for msearch.
  const client = es.Client({
    host: getEsUrl(http, packageVersion),
    log: 'info',
    requestTimeout: esRequestTimeout,
    apiVersion: esApiVersion,
  });

  const loadingCount$ = new BehaviorSubject(0);
  http.addLoadingCountSource(loadingCount$);

  return {
    search: wrapEsClientMethod(client, 'search', loadingCount$),
    msearch: wrapEsClientMethod(client, 'msearch', loadingCount$),
    create: wrapEsClientMethod(client, 'create', loadingCount$),
  };
}

function wrapEsClientMethod(esClient: any, method: string, loadingCount$: BehaviorSubject<number>) {
  return (args: any) => {
    // esClient returns a promise, with an additional abort handler
    // To tap into the abort handling, we have to override that abort handler.
    const customPromiseThingy = esClient[method](args);
    const { abort } = customPromiseThingy;
    let resolved = false;

    // Start LoadingIndicator
    loadingCount$.next(loadingCount$.getValue() + 1);

    // Stop LoadingIndicator when user aborts
    customPromiseThingy.abort = () => {
      abort();
      if (!resolved) {
        resolved = true;
        loadingCount$.next(loadingCount$.getValue() - 1);
      }
    };

    // Stop LoadingIndicator when promise finishes
    customPromiseThingy.finally(() => {
      resolved = true;
      loadingCount$.next(loadingCount$.getValue() - 1);
    });

    return customPromiseThingy;
  };
}

function getEsUrl(http: CoreStart['http'], packageVersion: PackageInfo['version']) {
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
      'kbn-version': packageVersion,
    },
  };
}
