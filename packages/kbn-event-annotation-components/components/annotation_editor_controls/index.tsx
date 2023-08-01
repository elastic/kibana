/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense, lazy } from 'react';
import type { Props } from './annotation_editor_controls';

const AnnotationEditorControlsLazy = lazy(() => import('./annotation_editor_controls'));

export const AnnotationEditorControls = (props: Props) => (
  <Suspense fallback={null}>
    <AnnotationEditorControlsLazy {...props} />
  </Suspense>
);

export { annotationsIconSet } from './icon_set';
