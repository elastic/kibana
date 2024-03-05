/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
