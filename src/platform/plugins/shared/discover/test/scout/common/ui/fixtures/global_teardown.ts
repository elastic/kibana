/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture, EsClient, ScoutLogger } from '@kbn/scout';
import {
  METRICS_TEST_INDEX_NAME,
  METRICS_TEST_INDEX_NAME_OTHER,
} from '../../../metrics_experience/ui/fixtures/constants';
import { SECURITY_INDICES } from '../../../security_experience/ui/fixtures/constants';

interface DiscoverGlobalTeardownFixtures {
  esClient: EsClient;
  apiServices: ApiServicesFixture;
  log: ScoutLogger;
}

export const teardownDiscoverTestData = async ({
  esClient,
  apiServices,
  log,
}: DiscoverGlobalTeardownFixtures) => {
  log.debug('[teardown:discover] resetting isEsqlDefault feature flag');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'discover.isEsqlDefault': null,
    },
  });

  log.debug('[teardown:metrics] deleting custom metrics test indices');
  await esClient.indices.delete({ index: METRICS_TEST_INDEX_NAME, ignore_unavailable: true });
  await esClient.indices.delete({ index: METRICS_TEST_INDEX_NAME_OTHER, ignore_unavailable: true });

  log.debug('[teardown:security] deleting synthetic security test indices');
  for (const index of Object.values(SECURITY_INDICES)) {
    await esClient.indices.delete({ index, ignore_unavailable: true });
  }
};
