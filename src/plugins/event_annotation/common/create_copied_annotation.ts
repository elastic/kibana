/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultManualAnnotation } from './manual_event_annotation';
import { EventAnnotationConfig } from './types';

export const createCopiedAnnotation = (
  newId: string,
  timestamp: string,
  source?: EventAnnotationConfig
): EventAnnotationConfig => {
  if (!source) {
    return getDefaultManualAnnotation(newId, timestamp);
  }
  return {
    ...source,
    id: newId,
  };
};
