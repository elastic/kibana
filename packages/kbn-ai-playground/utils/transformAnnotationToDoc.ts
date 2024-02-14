/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Doc } from '../types';

export interface Annotation {
  metadata: { id: string; score: number };
  pageContent: string;
}

export const transformAnnotationToDoc = (annotation: Annotation): Doc => ({
  id: annotation.metadata.id,
  content: annotation.pageContent,
});
