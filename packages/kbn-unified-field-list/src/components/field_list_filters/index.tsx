/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListFiltersProps, GenericFieldListFilters } from './field_list_filters';
import { type FieldListItem } from '../../types';

const Fallback = () => <Fragment />;

const LazyFieldListFilters = React.lazy(
  () => import('./field_list_filters')
) as GenericFieldListFilters;

function WrappedFieldListFilters<T extends FieldListItem = DataViewField>(
  props: FieldListFiltersProps<T>
) {
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyFieldListFilters<T> {...props} />
    </React.Suspense>
  );
}

export const FieldListFilters = WrappedFieldListFilters;
export type { FieldListFiltersProps };
