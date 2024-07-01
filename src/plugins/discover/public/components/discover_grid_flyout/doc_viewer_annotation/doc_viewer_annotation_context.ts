/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';

interface DocViewerAnnotationContextParams {
  docVisAnnotation?: EventAnnotationConfig;
  onDocVisAnnotationChanged?: (annotation: EventAnnotationConfig | undefined) => void;
}

export const DocViewerAnnotationContext = React.createContext<DocViewerAnnotationContextParams>({});

export const useDocViewerAnnotationContext = () => {
  return React.useContext(DocViewerAnnotationContext);
};
