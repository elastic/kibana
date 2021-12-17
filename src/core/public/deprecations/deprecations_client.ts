/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { HttpStart } from '../http';
import type { DomainDeprecationDetails, DeprecationsGetResponse } from '../../server/types';

/* @internal */
export interface DeprecationsClientDeps {
  http: Pick<HttpStart, 'fetch'>;
}

/* @internal */
export type ResolveDeprecationResponse = { status: 'ok' } | { status: 'fail'; reason: string };

export class DeprecationsClient {
  private readonly http: Pick<HttpStart, 'fetch'>;
  constructor({ http }: DeprecationsClientDeps) {
    this.http = http;
  }

  private fetchDeprecations = async (): Promise<DomainDeprecationDetails[]> => {
    const { deprecations } = await this.http.fetch<DeprecationsGetResponse>('/api/deprecations/', {
      asSystemRequest: true,
    });

    return deprecations;
  };

  public getAllDeprecations = async () => {
    return await this.fetchDeprecations();
  };

  public getDeprecations = async (domainId: string) => {
    const deprecations = await this.fetchDeprecations();
    return deprecations.filter((deprecation) => deprecation.domainId === domainId);
  };

  public isDeprecationResolvable = (details: DomainDeprecationDetails) => {
    return typeof details.correctiveActions.api === 'object';
  };

  public resolveDeprecation = async (
    details: DomainDeprecationDetails
  ): Promise<ResolveDeprecationResponse> => {
    const { domainId, correctiveActions } = details;
    // explicit check required for TS type guard
    if (typeof correctiveActions.api !== 'object') {
      return {
        status: 'fail',
        reason: i18n.translate('core.deprecations.noCorrectiveAction', {
          defaultMessage: 'This deprecation cannot be resolved automatically.',
        }),
      };
    }

    const { body, method, path, omitContextFromBody = false } = correctiveActions.api;
    try {
      await this.http.fetch<void>({
        path,
        method,
        asSystemRequest: true,
        body: JSON.stringify({
          ...body,
          ...(omitContextFromBody ? {} : { deprecationDetails: { domainId } }),
        }),
      });
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'fail',
        reason: err.body.message,
      };
    }
  };
}
