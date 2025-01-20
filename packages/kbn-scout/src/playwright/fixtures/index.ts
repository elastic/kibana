/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from 'playwright/test';
import * as common from './common';
import * as spaceAware from './parallel_workers';
import * as singleThread from './single_worker/worker_scope';

export const scoutCoreFixtures = mergeTests(
  common.coreWorkerFixtures,
  common.validateTagsFixture,
  common.scoutPageFixture,
  common.pageObjectsFixture,
  common.esArchiverFixture,
  common.browserAuthFixture,
  singleThread.uiSettingsFixture
);
export const scoutCoreSpaceAwareFixtures = mergeTests(
  common.coreWorkerFixtures,
  common.validateTagsFixture,
  spaceAware.scoutPageSpaceFixture,
  common.pageObjectsFixture,
  spaceAware.browserAuthFixture,
  spaceAware.kbnSpaceFixture
);

export * from './types';
