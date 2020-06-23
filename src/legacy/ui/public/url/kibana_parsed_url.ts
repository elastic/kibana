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

import { parse } from 'url';

import { modifyUrl } from '../../../../core/public';
import { prependPath } from './prepend_path';

interface Options {
  /**
   * An optional base path for kibana. If supplied, should start with a "/".
   * e.g. in https://localhost:5601/gra/app/visualize#/edit/viz_id the
   * basePath is "/gra"
   */
  basePath?: string;

  /**
   * The app id.
   * e.g. in https://localhost:5601/gra/app/visualize#/edit/viz_id the app id is "kibana".
   */
  appId: string;

  /**
   * The path for a page in the the app. Should start with a "/". Don't include the hash sign. Can
   * include all query parameters.
   * e.g. in https://localhost:5601/gra/app/visualize#/edit/viz_id?g=state the appPath is
   * "/edit/viz_id?g=state"
   */
  appPath?: string;

  /**
   * Optional hostname. Uses current window location's hostname if hostname, port,
   * and protocol are undefined.
   */
  hostname?: string;

  /**
   * Optional port. Uses current window location's port if hostname, port,
   * and protocol are undefined.
   */
  port?: string;

  /**
   * Optional protocol. Uses current window location's protocol if hostname, port,
   * and protocol are undefined.
   */
  protocol?: string;
}

/**
 * Represents the pieces that make up a url in Kibana, offering some helpful functionality
 * for translating those pieces into absolute or relative urls. A Kibana url with a basePath
 * looks like this: http://localhost:5601/basePath/app/appId#/an/appPath?with=query&params
 *
 *  - basePath is "/basePath"
 *  - appId is "appId"
 *  - appPath is "/an/appPath?with=query&params"
 *
 * Almost all urls in Kibana should have this structure, including the "/app" portion in front of the appId
 * (one exception is the login link).
 */
export class KibanaParsedUrl {
  public appId: string;
  public appPath: string;
  public basePath: string;
  public hostname?: string;
  public protocol?: string;
  public port?: string;

  constructor(options: Options) {
    const { appId, basePath = '', appPath = '', hostname, protocol, port } = options;

    // We'll use window defaults
    const hostOrProtocolSpecified = hostname || protocol || port;

    this.basePath = basePath;
    this.appId = appId;
    this.appPath = appPath;
    this.hostname = hostOrProtocolSpecified ? hostname : window.location.hostname;
    this.port = hostOrProtocolSpecified ? port : window.location.port;
    this.protocol = hostOrProtocolSpecified ? protocol : window.location.protocol;
  }

  public getGlobalState() {
    if (!this.appPath) {
      return '';
    }
    const parsedUrl = parse(this.appPath, true);
    const query = parsedUrl.query || {};
    return query._g || '';
  }

  public setGlobalState(newGlobalState: string | string[]) {
    if (!this.appPath) {
      return;
    }

    this.appPath = modifyUrl(this.appPath, (parsed) => {
      parsed.query._g = newGlobalState;
    });
  }

  public addQueryParameter(name: string, val: string) {
    this.appPath = modifyUrl(this.appPath, (parsed) => {
      parsed.query[name] = val;
    });
  }

  public getHashedAppPath() {
    return `#${this.appPath}`;
  }

  public getAppBasePath() {
    return `/${this.appId}`;
  }

  public getAppRootPath() {
    return `/app${this.getAppBasePath()}${this.getHashedAppPath()}`;
  }

  public getRootRelativePath() {
    return prependPath(this.getAppRootPath(), this.basePath);
  }

  public getAbsoluteUrl() {
    return modifyUrl(this.getRootRelativePath(), (parsed) => {
      parsed.protocol = this.protocol;
      parsed.port = this.port;
      parsed.hostname = this.hostname;
    });
  }
}
