/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { EmbeddingExplorerDatasetResponse } from '../../../../common';

let cachedSampleDataset: EmbeddingExplorerDatasetResponse | undefined;

export const getSampleDataset = (): EmbeddingExplorerDatasetResponse => {
  if (!cachedSampleDataset) {
    cachedSampleDataset = JSON.parse(
      readFileSync(join(__dirname, 'hackernews_sample_dataset.json'), 'utf8')
    ) as EmbeddingExplorerDatasetResponse;
  }

  return cachedSampleDataset;
};
