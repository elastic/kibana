/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { ComponentType } from 'react';
import { Filter } from '@kbn/es-query';

export interface QuickFilter {
  name: string;
  icon?: Exclude<EuiIconType, ComponentType>;
  disabled?: boolean;
  filter: Filter;
}

export interface QuickFiltersGroup {
  groupName: string;
  icon?: Exclude<EuiIconType, ComponentType>;
  items: QuickFiltersMenuItem[];
}

export type QuickFiltersMenuItem = QuickFiltersGroup | QuickFilter;

export const isQuickFiltersGroup = (
  quickFiltersMenuItem: QuickFiltersMenuItem
): quickFiltersMenuItem is QuickFiltersGroup => 'items' in quickFiltersMenuItem;
