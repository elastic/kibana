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
import * as spaceAware from './parallel_run';
import * as singleThread from './single_thread';

export const scoutCoreFixtures = mergeTests(
  common.coreWorkerFixtures,
  common.browserAuthFixture,
  common.pageObjectsFixture,
  common.scoutPageFixture,
  common.validateTagsFixture,
  singleThread.uiSettingsFixture
);
export const scoutCoreSpaceAwareFixtures = mergeTests(
  common.coreWorkerFixtures,
  spaceAware.browserAuthFixture,
  common.pageObjectsFixture,
  common.validateTagsFixture,
  spaceAware.scoutSpacePageFixture,
  spaceAware.uiSettingsSpaceFixture,
  spaceAware.workerSpaceFixure
);

export * from './types';
