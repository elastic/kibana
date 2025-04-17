/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import type { IEsSearchResponse } from '@kbn/search-types';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrService } from './ftr_provider_context';

/**
 * Function copied from here:
 * x-pack/test/rule_registry/common/lib/authentication/spaces.ts
 * @param spaceId The space id we want to utilize
 */
const getSpaceUrlPrefix = (spaceId?: string): string => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

/**
 * Options for the send method
 */
export interface SendOptions {
  supertest: SuperTest.Agent;
  options: object;
  strategy: string;
  space?: string;
}

/**
 * Search Service that can reduce flake on the CI systems when they are under
 * pressure and search returns an async search response or a sync response.
 *
 * @example
 * const supertest = getService('supertest');
 * const search = getService('search');
 * const response = await search.send<MyType>({
 *   supertest,
 *   options: {
 *     defaultIndex: ['large_volume_dns_data'],
 *   },
 *   strategy: 'securitySolutionSearchStrategy',
 * });
 * expect(response).eql({ ... your value ... });
 */

export class SearchService extends FtrService {
  private readonly retry = this.ctx.getService('retry');

  /** Send method to send in your supertest, url, options, and strategy name */
  async send<T extends IEsSearchResponse>({ supertest, options, strategy, space }: SendOptions) {
    const spaceUrl = getSpaceUrlPrefix(space);
    const { body } = await this.retry.try(async () => {
      return supertest
        .post(`${spaceUrl}/internal/search/${strategy}`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'true')
        .send(options)
        .expect(200);
    });

    if (!body.isRunning) {
      return body;
    }

    const result = await this.retry.try(async () => {
      const resp = await supertest
        .post(`${spaceUrl}/internal/search/${strategy}/${body.id}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(options)
        .expect(200);
      expect(resp.body.isRunning).equal(false);
      return resp.body as T;
    });
    return result;
  }
}
