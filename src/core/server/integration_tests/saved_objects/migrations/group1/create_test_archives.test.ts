/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBaselineDocuments } from '../kibana_migrator_test_kit.fixtures';
import {
  BASELINE_DOCUMENTS_PER_TYPE_SMALL,
  BASELINE_DOCUMENTS_PER_TYPE_LARGE,
  BASELINE_ELASTICSEARCH_VERSION,
  BASELINE_TEST_ARCHIVE_SMALL,
  BASELINE_TEST_ARCHIVE_LARGE,
  createBaselineArchive,
} from '../kibana_migrator_archive_utils';

/**
 * Enable and execute this test ONLY IN YOUR DEV MACHINE, in order to build new test packages
 */
describe.skip('migration tests toolkit', () => {
  it('can create a 1k documents ZIP archive', async () => {
    await createBaselineArchive({
      esVersion: BASELINE_ELASTICSEARCH_VERSION,
      documents: getBaselineDocuments({ documentsPerType: BASELINE_DOCUMENTS_PER_TYPE_SMALL }),
      dataArchive: BASELINE_TEST_ARCHIVE_SMALL,
    });
  });

  it('can create a 600k documents ZIP archive', async () => {
    await createBaselineArchive({
      esVersion: BASELINE_ELASTICSEARCH_VERSION,
      documents: getBaselineDocuments({ documentsPerType: BASELINE_DOCUMENTS_PER_TYPE_LARGE }),
      dataArchive: BASELINE_TEST_ARCHIVE_LARGE,
    });
  });
});
