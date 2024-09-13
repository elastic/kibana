/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Direction } from '@elastic/eui';

export type OptionsListSortBy = '_count' | '_key';

export const OPTIONS_LIST_DEFAULT_SORT: OptionsListSortingType = {
  by: '_count',
  direction: 'desc',
};

export interface OptionsListSortingType {
  by: OptionsListSortBy;
  direction: Direction;
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
