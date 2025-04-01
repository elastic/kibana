/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { throwBadResponse } from '../../../model/helpers';
import { CLUSTER_SHARD_LIMIT_EXCEEDED_REASON } from '../../../common/constants';
import { isTypeof } from '../../actions';
import type { ModelStage } from '../types';

export const createTargetIndex: ModelStage<
  'CREATE_TARGET_INDEX',
  'INDEX_STATE_UPDATE_DONE' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    const left = res.left;
    if (isTypeof(left, 'index_not_green_timeout')) {
      // cluster might just be busy so we retry the action for a set number of times.
      const retryErrorMessage = `${left.message} Refer to ${context.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
      return delayRetryState(state, retryErrorMessage, context.maxRetryAttempts);
    } else if (isTypeof(left, 'cluster_shard_limit_exceeded')) {
      return {
        ...state,
        controlState: 'FATAL',
        reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${context.migrationDocLinks.clusterShardLimitExceeded}`,
      };
    } else {
      return throwBadResponse(state, left);
    }
  }

  const currentIndexMeta = cloneDeep(state.indexMappings._meta!);

  return {
    ...state,
    controlState: 'INDEX_STATE_UPDATE_DONE',
    previousMappings: state.indexMappings,
    currentIndexMeta,
    aliases: [],
    aliasActions: [],
    skipDocumentMigration: true,
    previousAlgorithm: 'zdt',
  };
};
