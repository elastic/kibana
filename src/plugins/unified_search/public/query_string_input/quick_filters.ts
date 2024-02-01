/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { EuiContextMenuPanelItemDescriptor } from '@elastic/eui/src/components/context_menu/context_menu';

type BaseContextMenuItem = Omit<EuiContextMenuPanelItemDescriptor, 'name' | 'title'>;

export interface QuickFilter extends BaseContextMenuItem {
  name: string;
  filter: Filter;
}

export interface QuickFiltersGroup extends BaseContextMenuItem {
  groupName: string;
  items: QuickFiltersMenuItem[];
}

export type QuickFiltersMenuItem = QuickFiltersGroup | QuickFilter;

export const isQuickFiltersGroup = (
  quickFiltersMenuItem: QuickFiltersMenuItem
): quickFiltersMenuItem is QuickFiltersGroup => 'items' in quickFiltersMenuItem;
