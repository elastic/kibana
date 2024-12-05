/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { ComponentType } from 'react';

export interface SearchBarCustomization {
  id: 'search_bar';
  CustomDataViewPicker?: ComponentType;
  PrependFilterBar?: ComponentType;
  CustomSearchBar?: ComponentType<TopNavMenuProps<AggregateQuery>>;
  hideDataViewPicker?: boolean;
}
