/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from 'src/core/public';
import type { PluginDeprecationDetails } from '../../server/types';

/**
 * @internal
 */
interface DeprecationsGetResponse {
  deprecationsInfo: PluginDeprecationDetails[];
}

/**
 * @internal
 */
export interface DeprecationsClientDeps {
  http: Pick<HttpSetup, 'fetch'>;
}

/** @public */
export interface GetDeprecationsConfig {
  /** set true to fetch a fresh copy of the deprecations from the kibana server. */
  skipCache?: boolean;
}

/** @public */
export type GetAllDeprecationsConfig = GetDeprecationsConfig;

export class DeprecationsClient {
  private readonly http: Pick<HttpSetup, 'fetch'>;
  private deprecations?: PluginDeprecationDetails[];
  constructor({ http }: DeprecationsClientDeps) {
    this.http = http;
  }

  private fetchDeprecations = async (skipCache?: boolean): Promise<PluginDeprecationDetails[]> => {
    if (!skipCache && this.deprecations) {
      return this.deprecations;
    }

    const { deprecationsInfo } = await this.http.fetch<DeprecationsGetResponse>(
      '/api/deprecations/',
      {
        asSystemRequest: true,
      }
    );

    this.deprecations = deprecationsInfo;
    return deprecationsInfo;
  };

  public getAllDeprecations = async ({ skipCache }: GetAllDeprecationsConfig = {}) => {
    return await this.fetchDeprecations(skipCache);
  };

  public getDeprecations = async (pluginId: string, { skipCache }: GetDeprecationsConfig = {}) => {
    const deprecations = await this.fetchDeprecations(skipCache);
    return deprecations.filter((deprecation) => deprecation.pluginId === pluginId);
  };

  public clearCache = () => {
    this.deprecations = undefined;
  };
}
