/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HttpFetchOptionsWithPath, HttpStart } from '@kbn/core-http-browser';
import type {
  DomainDeprecationDetails,
  DeprecationsGetResponse,
} from '@kbn/core-deprecations-common';
import type { ResolveDeprecationResponse } from '@kbn/core-deprecations-browser';

/* @internal */
export interface DeprecationsClientDeps {
  http: Pick<HttpStart, 'fetch'>;
}

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

  private getResolveFetchDetails = (
    details: DomainDeprecationDetails
  ): HttpFetchOptionsWithPath | undefined => {
    const { domainId, correctiveActions } = details;

    if (correctiveActions.api) {
      const { body, method, path, omitContextFromBody = false } = correctiveActions.api;

      return {
        path,
        method,
        asSystemRequest: true,
        body: JSON.stringify({
          ...body,
          ...(omitContextFromBody ? {} : { deprecationDetails: { domainId } }),
        }),
      };
    }

    if (correctiveActions.mark_as_resolved_api) {
      const { routeMethod, routePath, routeVersion, apiTotalCalls, totalMarkedAsResolved } =
        correctiveActions.mark_as_resolved_api;
      const incrementBy = apiTotalCalls - totalMarkedAsResolved;

      return {
        path: '/api/deprecations/mark_as_resolved',
        method: 'POST',
        asSystemRequest: true,
        body: JSON.stringify({
          domainId,
          routeMethod,
          routePath,
          routeVersion,
          incrementBy,
        }),
      };
    }
  };

  public resolveDeprecation = async (
    details: DomainDeprecationDetails
  ): Promise<ResolveDeprecationResponse> => {
    const { correctiveActions } = details;
    const noCorrectiveActionFail = {
      status: 'fail' as const,
      reason: i18n.translate('core.deprecations.noCorrectiveAction', {
        defaultMessage: 'This deprecation cannot be resolved automatically or marked as resolved.',
      }),
    };

    if (
      typeof correctiveActions.api !== 'object' &&
      typeof correctiveActions.mark_as_resolved_api !== 'object'
    ) {
      return noCorrectiveActionFail;
    }

    try {
      const fetchParams = this.getResolveFetchDetails(details);
      if (!fetchParams) {
        return noCorrectiveActionFail;
      }

      await this.http.fetch<void>(fetchParams);
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'fail',
        reason: err.body.message,
      };
    }
  };
}
