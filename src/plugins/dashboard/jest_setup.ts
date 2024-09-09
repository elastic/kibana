/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setStubDashboardServices } from './public/services/mocks';

/**
 * CAUTION: Be very mindful of the things you import in to this `jest_setup` file - anything that is imported
 * here (either directly or implicitly through dependencies) will be **unable** to be mocked elsewhere!
 *
 * Refer to the "Caution" section here:
 *   https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options
 */
setStubDashboardServices();
