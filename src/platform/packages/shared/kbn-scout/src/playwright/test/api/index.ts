/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestType, test as base, mergeTests } from 'playwright/test';
import {
  coreWorkerFixtures,
  esArchiverFixture,
  apiClientFixture,
  defaultRolesFixture,
  requestAuthFixture,
} from '../../fixtures/scope/worker';
import type {
  CoreWorkerFixtures,
  EsArchiverFixture,
  RequestAuthFixture,
  ApiClientFixture,
  DefaultRolesFixture,
} from '../../fixtures/scope/worker';

/**
 * Minimal set of fixtures for API tests.
 */
export interface ApiWorkerFixtures extends CoreWorkerFixtures {
  apiClient: ApiClientFixture;
  defaultRolesFixture: DefaultRolesFixture;
  requestAuth: RequestAuthFixture;
  esArchiver: EsArchiverFixture;
}

// This disables browser-related fixtures by overriding them with undefined
const noBrowserFixtures = base.extend({
  page: [
    async ({}, use: (value: undefined) => Promise<void>) => {
      await use(undefined);
    },
    { scope: 'test' },
  ] as any,
  browser: [
    async ({}, use: (value: undefined) => Promise<void>) => {
      await use(undefined);
    },
    { scope: 'worker' },
  ] as any,
  context: [
    async ({}, use: (value: undefined) => Promise<void>) => {
      await use(undefined);
    },
    { scope: 'test' },
  ] as any,
  request: [
    async ({}, use: (value: undefined) => Promise<void>) => {
      await use(undefined);
    },
    { scope: 'test' },
  ] as any,
});

/**
 * API test type with minimal fixtures.
 * This is used for Scout api tests that do not require browser interaction.
 */
export const apiTest = mergeTests(
  noBrowserFixtures,
  coreWorkerFixtures,
  apiClientFixture,
  defaultRolesFixture,
  requestAuthFixture,
  esArchiverFixture
) as unknown as TestType<{}, ApiWorkerFixtures>;
