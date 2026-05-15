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
import { gunzipSync } from 'zlib';

export interface SampleIndexDocument {
  author: string;
  embedding: number[];
  id: string;
  length: number;
  projection?: {
    x: number;
    y: number;
  };
  score: number;
  source_dataset: string;
  summary: string;
  text: string;
  time: string;
  title: string;
  type: string;
}

export interface SampleIndexDocumentsAsset {
  categoryField: string;
  datasetName: string;
  description: string;
  docs: SampleIndexDocument[];
  indexNamePrefix: string;
  labelField: string;
  projectionFields: {
    x: string;
    y: string;
  };
  vectorField: string;
}

let cachedSampleIndexDocuments: SampleIndexDocumentsAsset | undefined;

export const getSampleIndexDocuments = (): SampleIndexDocumentsAsset => {
  if (!cachedSampleIndexDocuments) {
    cachedSampleIndexDocuments = JSON.parse(
      gunzipSync(
        readFileSync(join(__dirname, 'hackernews_sample_index_documents.json.gz'))
      ).toString('utf8')
    ) as SampleIndexDocumentsAsset;
  }

  return cachedSampleIndexDocuments;
};
