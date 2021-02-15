/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  RequestHandlerContext,
  FakeRequest,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'kibana/server';

import { Framework } from '../../../plugin';
import { IndexPatternsFetcher } from '../../../../../data/server';
import { VisPayload } from '../../../../common/types';

/**
 * ReqFacade is a regular KibanaRequest object extended with additional service
 * references to ensure backwards compatibility for existing integrations.
 *
 * This will be replaced by standard KibanaRequest and RequestContext objects in a later version.
 */
export interface ReqFacade<T = unknown> extends FakeRequest {
  requestContext: RequestHandlerContext;
  framework: Framework;
  payload: T;
  pre: {
    indexPatternsService?: IndexPatternsFetcher;
  };
  getUiSettingsService: () => IUiSettingsClient;
  getSavedObjectsClient: () => SavedObjectsClientContract;
  getEsShardTimeout: () => Promise<number>;
}

export abstract class AbstractSearchStrategy {
  async search(req: ReqFacade<VisPayload>, bodies: any[], indexType?: string) {
    const requests: any[] = [];
    const { sessionId } = req.payload;

    bodies.forEach((body) => {
      requests.push(
        req.requestContext
          .search!.search(
            {
              indexType,
              params: {
                ...body,
              },
            },
            {
              sessionId,
            }
          )
          .toPromise()
      );
    });
    return Promise.all(requests);
  }

  checkForViability(
    req: ReqFacade<VisPayload>,
    indexPattern: string
  ): Promise<{ isViable: boolean; capabilities: unknown }> {
    throw new TypeError('Must override method');
  }

  async getFieldsForWildcard<TPayload = unknown>(
    req: ReqFacade<TPayload>,
    indexPattern: string,
    capabilities?: unknown
  ) {
    const { indexPatternsService } = req.pre;

    return await indexPatternsService!.getFieldsForWildcard({
      pattern: indexPattern,
      fieldCapsOptions: { allow_no_indices: true },
    });
  }
}
