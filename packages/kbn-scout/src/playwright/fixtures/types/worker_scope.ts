/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, SamlSessionManager } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { LoadActionPerfOptions } from '@kbn/es-archiver';
import { IndexStats } from '@kbn/es-archiver/src/lib/stats';
import type { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';

import { ScoutTestConfig } from '../../../types';
import { KibanaUrl } from '../../../common/services/kibana_url';

export interface EsArchiverFixture {
  /**
   * Loads an Elasticsearch archive if the specified data index is not present.
   * @param name The name of the archive to load.
   * @param performance An object of type LoadActionPerfOptions to measure and
   * report performance metrics during the load operation.
   * @returns A Promise that resolves to an object containing index statistics.
   */
  loadIfNeeded: (
    name: string,
    performance?: LoadActionPerfOptions | undefined
  ) => Promise<Record<string, IndexStats>>;
}

export interface UiSettingsFixture {
  /**
   * Applies one or more UI settings
   * @param values (UiSettingValues): An object containing key-value pairs of UI settings to apply.
   * @returns A Promise that resolves once the settings are applied.
   */
  set: (values: UiSettingValues) => Promise<void>;
  /**
   * Resets specific UI settings to their default values.
   * @param values A list of UI setting keys to unset.
   * @returns A Promise that resolves after the settings are unset.
   */
  unset: (...values: string[]) => Promise<any>;
  /**
   * Sets the default time range for Kibana.
   * @from The start time of the default time range.
   * @to The end time of the default time range.
   * @returns A Promise that resolves once the default time is set.
   */
  setDefaultTime: ({ from, to }: { from: string; to: string }) => Promise<void>;
}

/**
 * The `ScoutWorkerFixtures` type defines the set of fixtures that are available
 */
export interface ScoutWorkerFixtures {
  log: ToolingLog;
  config: ScoutTestConfig;
  kbnUrl: KibanaUrl;
  esClient: Client;
  kbnClient: KbnClient;
  uiSettings: UiSettingsFixture;
  esArchiver: EsArchiverFixture;
  samlAuth: SamlSessionManager;
}

// re-export to import types from '@kbn-scout'
export type { KbnClient, SamlSessionManager } from '@kbn/test';
export type { ToolingLog } from '@kbn/tooling-log';
export type { Client } from '@elastic/elasticsearch';
export type { KibanaUrl } from '../../../common/services/kibana_url';
