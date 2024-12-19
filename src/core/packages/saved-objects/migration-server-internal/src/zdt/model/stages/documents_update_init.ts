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
import type { MigrationLog } from '../../../types';
import { excludeUnusedTypesQuery } from '../../../core';
import type { ModelStage } from '../types';
import {
  getOutdatedDocumentsQuery,
  createDocumentTransformFn,
  checkVersionCompatibility,
} from '../../utils';

export const documentsUpdateInit: ModelStage<
  'DOCUMENTS_UPDATE_INIT',
  'SET_DOC_MIGRATION_STARTED' | 'DONE' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    throwBadResponse(state, res as never);
  }

  const types = context.types.map((type) => context.typeRegistry.getType(type)!);
  const logs: MigrationLog[] = [...state.logs];
  const excludeFilterHooks = Object.fromEntries(
    context.types
      .map((name) => context.typeRegistry.getType(name)!)
      .filter((type) => !!type.excludeOnUpgrade)
      .map((type) => [type.name, type.excludeOnUpgrade!])
  );
  const outdatedDocumentsQuery = getOutdatedDocumentsQuery({ types });
  const transformRawDocs = createDocumentTransformFn({
    serializer: context.serializer,
    documentMigrator: context.documentMigrator,
  });
  const commonState = {
    logs,
    excludeOnUpgradeQuery: excludeUnusedTypesQuery,
    excludeFromUpgradeFilterHooks: excludeFilterHooks,
    outdatedDocumentsQuery,
    transformRawDocs,
  };

  // index was previously using the v2 algo, we skip compat check and jump to next stage
  if (state.previousAlgorithm === 'v2') {
    return {
      ...state,
      ...commonState,
      controlState: 'SET_DOC_MIGRATION_STARTED',
    };
  }

  const versionCheck = checkVersionCompatibility({
    mappings: state.previousMappings,
    types,
    source: 'docVersions',
    deletedTypes: context.deletedTypes,
  });

  logs.push({
    level: 'info',
    message: `DOCUMENTS_UPDATE_INIT: doc version check result: ${versionCheck.status}`,
  });

  switch (versionCheck.status) {
    // app version is greater than the index mapping version.
    // scenario of an upgrade: we need to run the document migration.
    case 'greater':
      return {
        ...state,
        ...commonState,
        controlState: 'SET_DOC_MIGRATION_STARTED',
      };
    // app version and index mapping version are the same.
    // either application upgrade without model change, or a simple reboot on the same version.
    // There's nothing to do here, as documents are already at the same version.
    case 'equal':
      return {
        ...state,
        logs,
        controlState: 'DONE',
      };
    // app version is lower than the index mapping version.
    // Should only occur in case of rollback.
    // For now, we don't do anything.
    case 'lesser':
      return {
        ...state,
        logs,
        controlState: 'DONE',
      };
    // conflicts: version for some types are greater, some are lower
    // shouldn't occur in any normal scenario - cannot recover
    case 'conflict':
    default:
      return {
        ...state,
        logs,
        controlState: 'FATAL',
        reason: 'Model version conflict: inconsistent higher/lower versions',
      };
  }
};
