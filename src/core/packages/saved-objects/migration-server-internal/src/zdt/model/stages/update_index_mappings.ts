/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { throwBadResponse } from '../../../model/helpers';
import type { ModelStage } from '../types';

export const updateIndexMappings: ModelStage<
  'UPDATE_INDEX_MAPPINGS',
  'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK' | 'FATAL'
> = (state, res, context) => {
  if (Either.isRight(res)) {
    const right = res.right;
    return {
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
      updateTargetMappingsTaskId: right.taskId,
    };
  }

  throwBadResponse(state, res as never);
};
