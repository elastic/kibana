/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { LensEmbeddableOutput } from '@kbn/lens-plugin/public';
import type { Observable } from 'rxjs';

export interface LensChartLoadEvent {
  /**
   * Inspector adapters for the request
   */
  adapters: Partial<DefaultInspectorAdapters>;
  /**
   * Observable of the lens embeddable output
   */
  embeddableOutput$?: Observable<LensEmbeddableOutput>;
}
