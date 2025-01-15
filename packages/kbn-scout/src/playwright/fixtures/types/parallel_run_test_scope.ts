/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LoginFixture, ScoutPage } from './test_scope';
import { PageObjects } from '../../page_objects';

/**
 * The `ParallelRunTestScopeFixtures` type defines the set of fixtures that are available
 */
export interface ParallelRunTestFixtures {
  browserAuth: LoginFixture;
  page: ScoutPage;
  pageObjects: PageObjects;
}
