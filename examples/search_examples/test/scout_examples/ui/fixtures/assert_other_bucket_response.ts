/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { SearchExamplesPage } from './page_objects';

/**
 * Asserts other-bucket presence/absence from the Response tab (UI smoke only —
 * no exact doc_count; that belongs in API/unit coverage).
 */
export async function assertOtherBucketResponse(
  searchExamples: SearchExamplesPage,
  { expectOtherBucket }: { expectOtherBucket: boolean }
): Promise<void> {
  await searchExamples.responseTab.click();
  const { responseCodeBlock } = searchExamples;

  if (expectOtherBucket) {
    await expect(responseCodeBlock).toContainText('__other__');
  } else {
    await expect(responseCodeBlock).toContainText('"buckets"');
    await expect(responseCodeBlock).not.toContainText('__other__');
  }

  const buckets = JSON.parse(await responseCodeBlock.innerText()).aggregations[1].buckets as Array<{
    key: string;
  }>;
  expect(buckets).toHaveLength(expectOtherBucket ? 3 : 2);
  if (expectOtherBucket) {
    expect(buckets[2].key).toBe('__other__');
  }
}
