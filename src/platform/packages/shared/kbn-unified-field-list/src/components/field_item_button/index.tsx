/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type { FieldItemButtonProps, GenericFieldItemButtonType } from './field_item_button';
import { FieldListItem } from '../../types';

const Fallback = () => <Fragment />;

const LazyFieldItemButton = React.lazy(() =>
  import('./field_item_button').then((module) => ({ default: module.FieldItemButton }))
) as GenericFieldItemButtonType;

function WrappedFieldItemButton<T extends FieldListItem>(props: FieldItemButtonProps<T>) {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyFieldItemButton {...props} />
    </React.Suspense>
  );
}

export type { FieldItemButtonProps };
export const FieldItemButton = WrappedFieldItemButton;
