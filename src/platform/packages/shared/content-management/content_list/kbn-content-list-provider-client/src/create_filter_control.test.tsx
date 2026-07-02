/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { filter, type FilterContext } from '@kbn/content-list-toolbar';
import { createFilterControl } from './create_filter_control';
import { defineContentListFilter } from './filters';

const context: FilterContext = {
  hasSorting: true,
  hasTags: true,
  hasStarred: true,
  hasCreatedBy: true,
};

const contentTypeFilter = defineContentListFilter({
  id: 'contentType',
  title: 'Content type',
  getItemValue: (item: UserContentCommonSchema) => item.type,
});

describe('createFilterControl', () => {
  it('produces a declarative control that resolves to a placeable custom_component', () => {
    const Control = createFilterControl(contentTypeFilter, {
      'data-test-subj': 'contentListContentTypeFilter',
    });

    const parts = filter.parseChildren(<Control />);
    expect(parts).toHaveLength(1);

    const config = filter.resolve(parts[0], context);
    expect(config).toMatchObject({ type: 'custom_component' });
  });
});
