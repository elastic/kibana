/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import * as Either from 'fp-ts/lib/Either';
import type { MigrationLog } from '../../../types';
import { getAliases } from '../../../model/helpers';
import {
  getCurrentIndex,
  checkVersionCompatibility,
  buildIndexMappings,
  getAliasActions,
  getCreationAliases,
  generateAdditiveMappingDiff,
  checkIndexCurrentAlgorithm,
  removePropertiesFromV2,
} from '../../utils';
import type { ModelStage } from '../types';

export const init: ModelStage<
  'INIT',
  | 'CREATE_TARGET_INDEX'
  | 'UPDATE_INDEX_MAPPINGS'
  | 'UPDATE_ALIASES'
  | 'INDEX_STATE_UPDATE_DONE'
  | 'FATAL'
> = (state, res, context) => {
  const types = context.types.map((type) => context.typeRegistry.getType(type)!);
  const logs: MigrationLog[] = [...state.logs];

  const indices = res.right;
  const aliasesRes = getAliases(indices);
  if (Either.isLeft(aliasesRes)) {
    return {
      ...state,
      controlState: 'FATAL',
      reason: `The ${
        aliasesRes.left.alias
      } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
    };
  }
  const aliasMap = aliasesRes.right;

  const currentIndex = getCurrentIndex({
    indices: Object.keys(indices),
    aliases: aliasMap,
    indexPrefix: context.indexPrefix,
  });

  // No indices were found, likely because it is a fresh cluster.
  // In that case, we just create the index.
  if (!currentIndex) {
    return {
      ...state,
      logs,
      controlState: 'CREATE_TARGET_INDEX',
      currentIndex: `${context.indexPrefix}_1`,
      indexMappings: buildIndexMappings({ types }),
      creationAliases: getCreationAliases({
        indexPrefix: context.indexPrefix,
        kibanaVersion: context.kibanaVersion,
      }),
    };
  }

  // Index was found. This is the standard scenario, we check the model versions
  // compatibility before going further.
  const currentMappings = indices[currentIndex].mappings;

  // Index is already present, so we check which algo was last used on it
  const currentAlgo = checkIndexCurrentAlgorithm(currentMappings);

  logs.push({
    level: 'info',
    message: `INIT: current algo check result: ${currentAlgo}`,
  });

  // incompatible (pre 8.8/index-split https://github.com/elastic/kibana/pull/154888) v2 algo => we terminate
  if (currentAlgo === 'v2-incompatible') {
    return {
      ...state,
      logs,
      controlState: 'FATAL',
      reason: `Index ${currentIndex} is using an incompatible version of the v2 algorithm`,
    };
  }
  // unknown algo => we terminate
  if (currentAlgo === 'unknown') {
    return {
      ...state,
      logs,
      controlState: 'FATAL',
      reason: `Cannot identify algorithm used for index ${currentIndex}`,
    };
  }

  const existingAliases = Object.keys(indices[currentIndex].aliases);
  const aliasActions = getAliasActions({
    existingAliases,
    currentIndex,
    indexPrefix: context.indexPrefix,
    kibanaVersion: context.kibanaVersion,
  });
  // cloning as we may be mutating it in later stages.
  let currentIndexMeta = cloneDeep(currentMappings._meta!);
  if (currentAlgo === 'v2-compatible' || currentAlgo === 'v2-partially-migrated') {
    currentIndexMeta = removePropertiesFromV2(currentIndexMeta);
  }

  const commonState = {
    logs,
    currentIndex,
    currentIndexMeta,
    aliases: existingAliases,
    aliasActions,
    previousMappings: currentMappings,
    previousAlgorithm:
      currentAlgo === 'v2-compatible' || currentAlgo === 'v2-partially-migrated'
        ? ('v2' as const)
        : ('zdt' as const),
  };

  // compatible (8.8+) v2 algo => we jump to update index mapping
  if (currentAlgo === 'v2-compatible') {
    const indexMappings = buildIndexMappings({ types });
    return {
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS',
      ...commonState,
      additiveMappingChanges: indexMappings.properties,
    };
  }

  // Index was found and is already using ZDT algo. This is the standard scenario.
  // We check the model versions compatibility before going further.
  const versionCheck = checkVersionCompatibility({
    mappings: currentMappings,
    types,
    source: 'mappingVersions',
    deletedTypes: context.deletedTypes,
  });

  logs.push({
    level: 'info',
    message: `INIT: mapping version check result: ${versionCheck.status}`,
  });

  switch (versionCheck.status) {
    // app version is greater than the index mapping version.
    // scenario of an upgrade: we need to update the mappings
    case 'greater':
      const additiveMappingChanges = generateAdditiveMappingDiff({
        types,
        mapping: currentMappings,
        deletedTypes: context.deletedTypes,
      });
      return {
        ...state,
        controlState: 'UPDATE_INDEX_MAPPINGS',
        ...commonState,
        additiveMappingChanges,
      };
    // app version and index mapping version are the same.
    // either application upgrade without model change, or a simple reboot on the same version.
    // In that case we jump directly to alias update
    case 'equal':
      return {
        ...state,
        controlState: aliasActions.length ? 'UPDATE_ALIASES' : 'INDEX_STATE_UPDATE_DONE',
        ...commonState,
      };
    // app version is lower than the index mapping version.
    // either a rollback scenario, or an old node rebooting during the cohabitation period
    // in that case, we simply no-op the expand phase.
    case 'lesser':
      return {
        ...state,
        controlState: 'INDEX_STATE_UPDATE_DONE',
        ...commonState,
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
