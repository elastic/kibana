/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<<< HEAD:src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/tests/utils/validator/types.ts
import type { LensApiConfig } from '../../../schema';
import type { LensAttributes } from '../../../types';

export interface ValidateTransform<T extends LensApiConfig> {
  fromState: (attributes: LensAttributes) => void;
  fromApi: (config: T, excludedFields?: string[]) => void;
}
========
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

export { ESE_API_PATH, TEST_INDEX, TEST_DOC_ID, COMMON_HEADERS, FAKE_ASYNC_ID } from './constants';
export { verifyErrorResponse, shardDelayAgg, waitFor } from './helpers';
>>>>>>>> 9.4:src/platform/plugins/shared/data/test/scout/api/fixtures/index.ts
