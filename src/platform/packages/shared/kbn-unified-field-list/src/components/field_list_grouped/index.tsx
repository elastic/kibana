/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListGroupedProps, GenericFieldListGrouped } from './field_list_grouped';
import { type FieldListItem } from '../../types';

const Fallback = () => <Fragment />;

const LazyFieldListGrouped = React.lazy(
  () => import('./field_list_grouped')
) as GenericFieldListGrouped;

function WrappedFieldListGrouped<T extends FieldListItem = DataViewField>(
  props: FieldListGroupedProps<T>
) {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyFieldListGrouped<T> {...props} />
    </React.Suspense>
  );
}

export const FieldListGrouped = WrappedFieldListGrouped;
export type { FieldListGroupedProps };
