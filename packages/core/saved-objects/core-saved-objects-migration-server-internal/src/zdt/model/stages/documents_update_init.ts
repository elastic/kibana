/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { throwBadResponse } from '../../../model/helpers';
import { excludeUnusedTypesQuery } from '../../../core';
import type { ModelStage } from '../types';
import { getOutdatedDocumentsQuery, createDocumentTransformFn } from '../../utils';

export const documentsUpdateInit: ModelStage<
  'DOCUMENTS_UPDATE_INIT',
  'SET_DOC_MIGRATION_STARTED'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  const excludeFilterHooks = Object.fromEntries(
    context.types
      .map((name) => context.typeRegistry.getType(name)!)
      .filter((type) => !!type.excludeOnUpgrade)
      .map((type) => [type.name, type.excludeOnUpgrade!])
  );

  const types = context.types.map((type) => context.typeRegistry.getType(type)!);
  const outdatedDocumentsQuery = getOutdatedDocumentsQuery({ types });

  const transformRawDocs = createDocumentTransformFn({
    serializer: context.serializer,
    documentMigrator: context.documentMigrator,
  });

  return {
    ...state,
    excludeOnUpgradeQuery: excludeUnusedTypesQuery,
    excludeFromUpgradeFilterHooks: excludeFilterHooks,
    outdatedDocumentsQuery,
    transformRawDocs,
    controlState: 'SET_DOC_MIGRATION_STARTED',
  };
};
