/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The samlAuthFixture extends the base coreWorkerFixtures with `samlAuth`.
// Re-export it as `coreWorkerFixtures` so all downstream consumers get
// the full fixture set (including samlAuth) without any import-path changes.
export { samlAuthFixture as coreWorkerFixtures } from './saml_auth';
export type { ScoutLogger, ScoutTestConfig, KibanaUrl, EsClient, KbnClient } from './core_fixtures';
export type { SamlAuth, CoreWorkerFixtures } from './saml_auth';

export { esArchiverFixture } from './es_archiver';
export type { EsArchiverFixture } from './es_archiver';

export { linkedEsFixtures } from './linked_es_archiver';
export type { LinkedProjectFixture } from './linked_es_archiver';

export { uiSettingsFixture } from './ui_settings';
export type { UiSettingsFixture } from './ui_settings';

export { scoutSpaceParallelFixture } from './scout_space';
export type { ScoutSpaceParallelFixture, SpaceSolutionView } from './scout_space';

export { apiServicesFixture } from './apis';
export type { ApiServicesFixture } from './apis';

export { lighthouseFixture } from './lighthouse';
export type { LighthouseFixture, LighthouseAuditOptions } from './lighthouse';

export { requestAuthFixture } from './api_key';
export type { RequestAuthFixture } from './api_key';

export { apiClientFixture } from './api_client';
export type { ApiClientFixture, ApiClientOptions, ApiClientResponse } from './api_client';

export { defaultRolesFixture } from './default_roles';
export type { DefaultRolesFixture } from './default_roles';
