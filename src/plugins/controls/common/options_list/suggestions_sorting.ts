/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Direction } from '@elastic/eui';

export type OptionsListSortBy = '_count' | '_key';

export const DEFAULT_SORT: SortingType = { by: '_count', direction: 'desc' };

export const sortDirections: Readonly<Direction[]> = ['asc', 'desc'] as const;
export type SortDirection = typeof sortDirections[number];
export interface SortingType {
  by: OptionsListSortBy;
  direction: SortDirection;
}

export const getCompatibleSortingTypes = (type?: string): OptionsListSortBy[] => {
  switch (type) {
    case 'ip': {
      return ['_count'];
    }
    default: {
      return ['_count', '_key'];
    }
  }
};
