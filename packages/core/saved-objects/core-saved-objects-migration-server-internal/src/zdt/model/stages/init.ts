/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import { delayRetryState } from '../../../model/retry_state';
import { throwBadResponse } from '../../../model/helpers';
import type { MigrationLog } from '../../../types';
import { isTypeof } from '../../actions';
import {
  getCurrentIndex,
  checkVersionCompatibility,
  buildIndexMappings,
  getAliasActions,
  generateAdditiveMappingDiff,
} from '../../utils';
import type { ModelStage } from '../types';

export const init: ModelStage<
  'INIT',
  'CREATE_TARGET_INDEX' | 'UPDATE_INDEX_MAPPINGS' | 'UPDATE_ALIASES' | 'FATAL'
> = (state, res, context) => {
  if (Either.isLeft(res)) {
    const left = res.left;
    if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
      const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${context.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
      return delayRetryState(state, retryErrorMessage, context.maxRetryAttempts);
    } else {
      return throwBadResponse(state, left);
    }
  }

  const types = context.types.map((type) => context.typeRegistry.getType(type)!);
  const logs: MigrationLog[] = [...state.logs];

  const indices = res.right;
  const currentIndex = getCurrentIndex(indices, context.indexPrefix);

  // No indices were found, likely because it is the first time Kibana boots.
  // In that case, we just create the index.
  if (!currentIndex) {
    return {
      ...state,
      logs,
      controlState: 'CREATE_TARGET_INDEX',
      currentIndex: `${context.indexPrefix}_1`,
      indexMappings: buildIndexMappings({ types }),
    };
  }

  // Index was found. This is the standard scenario, we check the model versions
  // compatibility before going further.
  const currentMappings = indices[currentIndex].mappings;
  const versionCheck = checkVersionCompatibility({
    mappings: currentMappings,
    types,
    source: 'mappingVersions',
    deletedTypes: context.deletedTypes,
  });

  logs.push({
    level: 'info',
    message: `Mappings model version check result: ${versionCheck.status}`,
  });

  const aliases = Object.keys(indices[currentIndex].aliases);
  const aliasActions = getAliasActions({
    existingAliases: aliases,
    currentIndex,
    indexPrefix: context.indexPrefix,
    kibanaVersion: context.kibanaVersion,
  });
  // cloning as we may be mutating it in later stages.
  const currentIndexMeta = cloneDeep(currentMappings._meta!);

  switch (versionCheck.status) {
    // app version is greater than the index mapping version.
    // scenario of an upgrade: we need to update the mappings
    case 'greater':
      const additiveMappingChanges = generateAdditiveMappingDiff({
        types,
        meta: currentMappings._meta ?? {},
        deletedTypes: context.deletedTypes,
      });
      return {
        ...state,
        controlState: 'UPDATE_INDEX_MAPPINGS',
        logs,
        currentIndex,
        currentIndexMeta,
        aliases,
        aliasActions,
        previousMappings: currentMappings,
        additiveMappingChanges,
      };
    // app version and index mapping version are the same.
    // either application upgrade without model change, or a simple reboot on the same version.
    // In that case we jump directly to alias update
    case 'equal':
      return {
        ...state,
        controlState: 'UPDATE_ALIASES',
        logs,
        currentIndex,
        currentIndexMeta,
        aliases,
        aliasActions,
        previousMappings: currentMappings,
      };
    // app version is lower than the index mapping version.
    // likely a rollback scenario - unsupported for the initial implementation
    case 'lesser':
      return {
        ...state,
        controlState: 'FATAL',
        reason: 'Downgrading model version is currently unsupported',
        logs,
      };
    // conflicts: version for some types are greater, some are lower
    // shouldn't occur in any normal scenario - cannot recover
    case 'conflict':
    default:
      return {
        ...state,
        controlState: 'FATAL',
        reason: 'Model version conflict: inconsistent higher/lower versions',
        logs,
      };
  }
};
