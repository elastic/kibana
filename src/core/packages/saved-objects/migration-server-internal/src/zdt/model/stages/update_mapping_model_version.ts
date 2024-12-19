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
import { setMetaMappingMigrationComplete } from '../../utils';

export const updateMappingModelVersion: ModelStage<
  'UPDATE_MAPPING_MODEL_VERSIONS',
  'UPDATE_ALIASES' | 'INDEX_STATE_UPDATE_DONE'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  return {
    ...state,
    controlState: state.aliasActions.length ? 'UPDATE_ALIASES' : 'INDEX_STATE_UPDATE_DONE',
    currentIndexMeta: setMetaMappingMigrationComplete({
      meta: state.currentIndexMeta,
      versions: context.typeVirtualVersions,
    }),
  };
};
