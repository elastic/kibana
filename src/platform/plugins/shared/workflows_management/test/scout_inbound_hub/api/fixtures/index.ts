/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultRolesFixture, mergeTests, requestAuthFixture } from '@kbn/scout';

import { spaceTest as workflowsSpaceTest } from '../../../scout/api/fixtures';

/**
 * The shared workflows space test has no API-key fixture. `defaultRoles` is what
 * `requestAuth` reads when a key is not the empty admin descriptor.
 */
export const spaceTest = mergeTests(workflowsSpaceTest, defaultRolesFixture, requestAuthFixture);
