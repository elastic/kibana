/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreService } from '../../types';
import type { HttpStart } from '../http';
import { DeprecationsClient, ResolveDeprecationResponse } from './deprecations_client';
import type { DomainDeprecationDetails } from '../../server/types';

/**
 * DeprecationsService provides methods to fetch domain deprecation details from
 * the Kibana server.
 *
 * @public
 */
export interface DeprecationsServiceStart {
  /**
   * Grabs deprecations details for all domains.
   */
  getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
  /**
   * Grabs deprecations for a specific domain.
   *
   * @param {string} domainId
   */
  getDeprecations: (domainId: string) => Promise<DomainDeprecationDetails[]>;
  /**
   * Returns a boolean if the provided deprecation can be automatically resolvable.
   *
   * @param {DomainDeprecationDetails} details
   */
  isDeprecationResolvable: (details: DomainDeprecationDetails) => boolean;
  /**
   * Calls the correctiveActions.api to automatically resolve the depprecation.
   *
   * @param {DomainDeprecationDetails} details
   */
  resolveDeprecation: (details: DomainDeprecationDetails) => Promise<ResolveDeprecationResponse>;
}

export class DeprecationsService implements CoreService<void, DeprecationsServiceStart> {
  public setup(): void {}

  public start({ http }: { http: HttpStart }): DeprecationsServiceStart {
    const deprecationsClient = new DeprecationsClient({ http });

    return {
      getAllDeprecations: deprecationsClient.getAllDeprecations,
      getDeprecations: deprecationsClient.getDeprecations,
      isDeprecationResolvable: deprecationsClient.isDeprecationResolvable,
      resolveDeprecation: deprecationsClient.resolveDeprecation,
    };
  }

  public stop(): void {}
}
