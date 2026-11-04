/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import * as Either from 'fp-ts/Either';
import Semver from 'semver';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { AliasAction, FetchIndexResponse } from '../actions';
import type { MigrationLog } from '../types';
import { getAliases } from '../model/helpers';
import { checkVersionCompatibility, getAliasActions, getCurrentIndex } from '../zdt/utils';
import type { MigrationContext } from './context';

/** The outcome of inspecting the indices of a prefix, from the point of view of this node. */
export type IndexEvaluation =
  | { readonly type: 'fatal'; readonly reason: string }
  /** The index doesn't exist yet. */
  | { readonly type: 'create'; readonly currentIndex: string; readonly aliases: string[] }
  /** Another node must update the index, this node waits for it. */
  | { readonly type: 'wait'; readonly reason: string }
  /** The index exists. The plan may contain no work at all. */
  | ({ readonly type: 'update' } & UpdatePlan);

export interface UpdatePlan {
  readonly currentIndex: string;
  readonly previousMappings: IndexMapping;
  readonly updateMappings: boolean;
  readonly aliasActions: AliasAction[];
  readonly convertDocuments: boolean;
  readonly logs: MigrationLog[];
}

export const hasWrites = ({ updateMappings, aliasActions, convertDocuments }: UpdatePlan) =>
  updateMappings || aliasActions.length > 0 || convertDocuments;

const legacyIndexReason = (index: string, { minimumPreviousVersion }: MigrationContext) =>
  `The ${index} index was created by an unsupported Kibana version. ` +
  (minimumPreviousVersion
    ? `Please upgrade to Kibana ${minimumPreviousVersion} or newer first.`
    : 'Please upgrade to an intermediate Kibana version first.');

/** The Kibana versions of the `<prefix>_<version>` aliases, latest first. */
const getVersionAliases = (indexPrefix: string, aliases: string[]): string[] => {
  const matcher = new RegExp(`^${escapeRegExp(indexPrefix)}_(\\d+\\.\\d+\\.\\d+)$`);
  return aliases
    .map((alias) => matcher.exec(alias)?.[1])
    .filter((version): version is string => version !== undefined)
    .sort(Semver.rcompare);
};

/**
 * Removes the version aliases of older Kibana versions, so that stale instances can no longer write.
 * `must_exist` makes the update fail if another instance changed the aliases since they were read.
 */
const getRemoveAliasActions = (
  context: MigrationContext,
  currentIndex: string,
  versions: string[]
): AliasAction[] =>
  versions
    .filter((version) => Semver.lt(version, context.kibanaVersion))
    .map((version) => ({
      remove: {
        index: currentIndex,
        alias: `${context.indexPrefix}_${version}`,
        must_exist: true,
      },
    }));

interface IndexSettings {
  readonly index?: { readonly blocks?: { readonly write?: string | boolean } };
}

/** The write block that older Kibana versions set on the source index of a reindex migration. */
const hasWriteBlock = (settings: IndexSettings | undefined): boolean =>
  String(settings?.index?.blocks?.write) === 'true';

/**
 * `<prefix>_*` also matches the indices of longer prefixes (e.g. `.kibana_task_manager_1` for `.kibana`).
 * Keeps the indices named or aliased after `indexPrefix`, so that other prefixes can't affect this migration.
 */
const getOwnIndices = (indexPrefix: string, indices: FetchIndexResponse): FetchIndexResponse => {
  const prefix = escapeRegExp(indexPrefix);
  const ownName = new RegExp(`^${prefix}(_\\d+)?$`);
  const ownAlias = new RegExp(`^${prefix}(_\\d+\\.\\d+\\.\\d+)?$`);
  return Object.fromEntries(
    Object.entries(indices).filter(
      ([name, { aliases }]) =>
        ownName.test(name) || Object.keys(aliases ?? {}).some((alias) => ownAlias.test(alias))
    )
  );
};

/**
 * Decides what this node must do with the index of `context.indexPrefix`, given the result of fetching the indices.
 * Pure: shared by INIT and WAIT_FOR_MIGRATION_COMPLETION.
 */
export const evaluateIndex = (
  context: MigrationContext,
  fetchedIndices: FetchIndexResponse
): IndexEvaluation => {
  const { indexPrefix, kibanaVersion } = context;
  const indices = getOwnIndices(indexPrefix, fetchedIndices);
  const aliasesRes = getAliases(indices);
  if (Either.isLeft(aliasesRes)) {
    return {
      type: 'fatal',
      reason: `The ${
        aliasesRes.left.alias
      } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
    };
  }

  if (indices[indexPrefix]) {
    return { type: 'fatal', reason: legacyIndexReason(indexPrefix, context) };
  }

  const currentIndex = getCurrentIndex({
    indices: Object.keys(indices),
    aliases: aliasesRes.right,
    indexPrefix,
  });

  if (!currentIndex) {
    return context.waitForMigrationCompletion
      ? { type: 'wait', reason: `The ${indexPrefix} index does not exist yet.` }
      : {
          type: 'create',
          currentIndex: `${indexPrefix}_1`,
          aliases: [indexPrefix, `${indexPrefix}_${kibanaVersion}`],
        };
  }

  const { mappings: previousMappings, aliases, settings } = indices[currentIndex];
  const versions = getVersionAliases(indexPrefix, Object.keys(aliases ?? {}));
  if (!previousMappings._meta?.mappingVersions || versions.length === 0) {
    return { type: 'fatal', reason: legacyIndexReason(currentIndex, context) };
  }
  if (hasWriteBlock(settings as IndexSettings | undefined)) {
    return {
      type: 'fatal',
      reason:
        `The ${currentIndex} index has a write block, probably left by a migration of an older Kibana version ` +
        `that did not complete. Make sure that no other Kibana instance is running, remove the block ` +
        `(PUT ${currentIndex}/_settings {"index.blocks.write": false}) and restart Kibana.`,
    };
  }

  const [latestVersion] = versions;
  if (context.minimumPreviousVersion && Semver.lt(latestVersion, context.minimumPreviousVersion)) {
    return {
      type: 'fatal',
      reason: `Kibana ${latestVersion} deployment detected. Please upgrade to Kibana ${
        context.minimumPreviousVersion
      } or newer before upgrading to ${Semver.major(kibanaVersion)}.x series.`,
    };
  }
  if (!context.allowDowngrade && Semver.gt(latestVersion, kibanaVersion)) {
    return {
      type: 'fatal',
      reason: `The ${indexPrefix}_${latestVersion} alias refers to a newer version of Kibana: v${latestVersion}`,
    };
  }

  const mappingsStatus = checkVersionCompatibility({
    mappings: previousMappings,
    types: context.typeDefinitions,
    source: 'mappingVersions',
    deletedTypes: context.deletedTypes,
  }).status;
  // indices last written by v2 have no docVersions: their documents must be checked
  const documentsStatus = previousMappings._meta.docVersions
    ? checkVersionCompatibility({
        mappings: previousMappings,
        types: context.typeDefinitions,
        source: 'docVersions',
        deletedTypes: context.deletedTypes,
      }).status
    : 'greater';

  const logs: MigrationLog[] = [
    {
      level: 'info',
      message: `INIT: mappings model versions check: ${mappingsStatus}, documents model versions check: ${documentsStatus}`,
    },
  ];

  if (mappingsStatus === 'conflict' || documentsStatus === 'conflict') {
    return {
      type: 'fatal',
      reason: 'Model version conflict: inconsistent higher/lower versions',
    };
  }

  if (mappingsStatus === 'lesser' || documentsStatus === 'lesser') {
    if (!context.allowDowngrade) {
      return {
        type: 'fatal',
        reason: `The ${currentIndex} index was last updated by a newer version of Kibana`,
      };
    }
    return {
      type: 'update',
      currentIndex,
      previousMappings,
      updateMappings: false,
      aliasActions: [],
      convertDocuments: false,
      logs: [
        ...logs,
        {
          level: 'info',
          message: `INIT: the ${currentIndex} index was last updated by a newer version of Kibana, leaving it untouched`,
        },
      ],
    };
  }

  const aliasActions = [
    ...getAliasActions({
      indexPrefix,
      currentIndex,
      existingAliases: Object.keys(aliases ?? {}),
      kibanaVersion,
    }),
    ...(context.removeOutdatedVersionAliases
      ? getRemoveAliasActions(context, currentIndex, versions)
      : []),
  ];
  const plan: UpdatePlan = {
    currentIndex,
    previousMappings,
    updateMappings: mappingsStatus === 'greater',
    aliasActions,
    convertDocuments: context.migrateDocuments && documentsStatus === 'greater',
    logs,
  };

  if (context.waitForMigrationCompletion && (hasWrites(plan) || documentsStatus === 'greater')) {
    return {
      type: 'wait',
      reason: `The ${currentIndex} index must be updated by another Kibana instance.`,
    };
  }

  return { type: 'update', ...plan };
};
