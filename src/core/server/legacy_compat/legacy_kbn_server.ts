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

/**
 * Represents a wrapper around legacy `kbnServer` instance that exposes only
 * a subset of `kbnServer` APIs used by the new platform.
 * @internal
 */
export class LegacyKbnServer {
  constructor(private readonly rawKbnServer: any) {}

  /**
   * Custom HTTP Listener used by HapiJS server in the legacy platform.
   */
  get newPlatformProxyListener() {
    return this.rawKbnServer.newPlatform.proxyListener;
  }

  /**
   * Forwards log request to the legacy platform.
   * @param tags A string or array of strings used to briefly identify the event.
   * @param [data] Optional string or object to log with the event.
   * @param [timestamp] Timestamp value associated with the log record.
   */
  public log(tags: string | string[], data?: string | Error, timestamp?: Date) {
    this.rawKbnServer.server.log(tags, data, timestamp);
  }
}
