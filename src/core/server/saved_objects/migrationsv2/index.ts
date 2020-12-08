/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Option from 'fp-ts/lib/Option';

import { ElasticsearchClient } from '../../elasticsearch';
import { IndexMapping } from '../mappings';
import { Logger, LogMeta } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { stateActionMachine } from './state_action_machine';
import { MigrationResult } from '../migrations/core';
import { State } from './types';
import { next } from './next';
import { model } from './model';
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '..';

export async function migrationStateMachine({
  client,
  kibanaVersion,
  targetMappings,
  logger,
  preMigrationScript,
  transformRawDocs,
  migrationVersionPerType,
  indexPrefix,
}: {
  client: ElasticsearchClient;
  kibanaVersion: string;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  logger: Logger;
  serializer: SavedObjectsSerializer;
  transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
}): Promise<MigrationResult> {
  const outdatedDocumentsQuery = {
    bool: {
      should: Object.entries(migrationVersionPerType).map(([type, latestVersion]) => ({
        bool: {
          must: [
            { exists: { field: type } },
            {
              bool: {
                must_not: { term: { [`migrationVersion.${type}`]: latestVersion } },
              },
            },
          ],
        },
      })),
    },
  };

  const indexLogger = logger.get(indexPrefix.slice(1));

  const initialState: State = {
    controlState: 'INIT',
    indexPrefix,
    legacyIndex: indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: indexPrefix + '_' + kibanaVersion,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    kibanaVersion,
    preMigrationScript: Option.fromNullable(preMigrationScript),
    targetMappings,
    outdatedDocumentsQuery,
    retryCount: 0,
    retryDelay: 0,
    logs: [],
  };

  const logStateTransition = (oldState: State, newState: State) => {
    if (newState.logs.length > oldState.logs.length) {
      newState.logs
        .slice(oldState.logs.length)
        .forEach((log) => indexLogger[log.level](log.message));
    }

    // Sanitize the state for logging by removing logs and documents which
    // might contain sensitive information.
    // @ts-expect-error outdatedDocuments don't exist in all states
    const { logs, outdatedDocuments, ...logState } = newState;
    indexLogger.info(`${oldState.controlState} -> ${newState.controlState}: `, logState);
  };

  const logActionResponse = (state: State, res: unknown) => {
    indexLogger.info(`${state.controlState} RESPONSE`, res as LogMeta);
  };

  try {
    const finalState = await stateActionMachine<State>(
      initialState,
      (state) => next(client, transformRawDocs, state),
      (state, res) => {
        logActionResponse(state, res);
        const newState = model(state, res);
        logStateTransition(state, newState);
        return newState;
      }
    );

    if (finalState.controlState === 'DONE') {
      return Option.fold<string, MigrationResult>(
        () => ({
          status: 'patched' as const,
          destIndex: finalState.targetIndex,
          elapsedMs: 0,
        }),
        (sourceIndex) => ({
          status: 'migrated' as const,
          destIndex: finalState.targetIndex,
          sourceIndex,
          elapsedMs: 0,
        })
      )(finalState.sourceIndex);
    } else if (finalState.controlState === 'FATAL') {
      return Promise.reject(
        new Error(
          `Unable to complete saved object migrations for the [${indexPrefix}] index. ` +
            finalState.reason
        )
      );
    } else {
      throw new Error('Invalid terminating control state');
    }
  } catch (e) {
    logger.error(e);
    throw new Error(
      `Unable to complete saved object migrations for the [${indexPrefix}] index. Please check the health of your Elasticsearch cluster`
    );
  }
}
