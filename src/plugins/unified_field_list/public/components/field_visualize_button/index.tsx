/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import type { FieldVisualizeButtonProps } from './field_visualize_button';

const Fallback = () => <Fragment />;

const LazyFieldVisualizeButton = React.lazy(() => import('./field_visualize_button'));
const WrappedFieldVisualizeButton: React.FC<FieldVisualizeButtonProps> = (props) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFieldVisualizeButton {...props} />
  </React.Suspense>
);

export const FieldVisualizeButton = WrappedFieldVisualizeButton;
export type { FieldVisualizeButtonProps };

// TODO: move to another plugin?
export {
  triggerVisualizeActions,
  getVisualizeInformation,
  type VisualizeInformation,
} from './visualize_trigger_utils';
