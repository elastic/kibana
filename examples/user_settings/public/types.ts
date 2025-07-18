/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { UserSettingsService } from '@kbn/core-user-settings-browser';
import type { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export interface AppSetupDeps {
  developerExamples: DeveloperExamplesSetup;
  spaces: SpacesPluginSetup;
}

export interface AppStartDeps {
  spaces: SpacesPluginStart;
}

export interface AppServices extends AppStartDeps {
  userSettings: UserSettingsService;
}
