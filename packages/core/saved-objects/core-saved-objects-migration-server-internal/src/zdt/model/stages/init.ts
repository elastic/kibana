/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { throwBadResponse } from '../../../model/helpers';
import { isTypeof } from '../../actions';
import type { State } from '../../state';
import type { ModelStage } from '../types';

export const init: ModelStage<'INIT', 'DONE' | 'FATAL'> = (state, res, context): State => {
  if (Either.isLeft(res)) {
    const left = res.left;
    if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
      const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${context.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
      return delayRetryState(state, retryErrorMessage, context.maxRetryAttempts);
    } else {
      return throwBadResponse(state, left);
    }
  }

  // nothing implemented yet, just going to 'DONE'
  return {
    ...state,
    controlState: 'DONE',
  };
};
