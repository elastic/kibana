/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from 'playwright/test';
import { apiServicesFixture, coreWorkerFixtures, esArchiverFixture } from '@kbn/scout';
import { synthtraceFixture } from './synthtrace_fixture';

/**
 * Same worker fixtures as `@kbn/scout` `globalSetupHook`, plus synthtrace clients.
 * Use this (or `mergeTests(globalSetupHook, synthtraceFixture)`) when parallel global setup
 * needs `apmSynthtraceEsClient` / `logsSynthtraceEsClient` / etc.
 */
export const globalSetupHookWithSynthtrace = mergeTests(
  coreWorkerFixtures,
  esArchiverFixture,
  synthtraceFixture,
  apiServicesFixture
);
