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

import { ElasticsearchClient } from '../../elasticsearch';
import { IndexMapping } from '../mappings';
import { Logger } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { MigrationResult } from '../migrations/core';
import { next, TransformRawDocs } from './next';
import { createInitialState, model } from './model';
import { migrationStateActionMachine } from './migrations_state_action_machine';

/**
 * Migrates the provided indexPrefix index using a resilient algorithm that is
 * completely lock-free so that any failure can always be retried by
 * restarting Kibana.
 */
export async function runResilientMigrator({
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
  transformRawDocs: TransformRawDocs;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
}): Promise<MigrationResult> {
  const initialState = createInitialState({
    kibanaVersion,
    targetMappings,
    preMigrationScript,
    migrationVersionPerType,
    indexPrefix,
  });
  return migrationStateActionMachine({
    initialState,
    logger,
    next: next(client, transformRawDocs),
    model,
  });
}
