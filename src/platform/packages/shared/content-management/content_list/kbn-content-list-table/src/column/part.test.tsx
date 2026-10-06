/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import { column, createColumn } from './part';
import type { ColumnBuilderContext } from './types';

const context = {} as ColumnBuilderContext;

const resolveColumn = (element: ReactElement) => {
  const [part] = column.parseChildren(element);
  return column.resolve(part, context);
};

describe('createColumn', () => {
  const TypeColumn = createColumn({
    id: 'typeTitle',
    name: 'Type',
    field: 'typeTitle',
    sortable: true,
    width: '11em',
    truncateText: true,
    render: (item: ContentListItem) => `type:${(item as { typeTitle?: string }).typeTitle ?? ''}`,
  });

  it('resolves the baked-in config into an EuiBasicTableColumn', () => {
    const resolved = resolveColumn(createElement(TypeColumn));

    expect(resolved).toMatchObject({
      field: 'typeTitle',
      name: 'Type',
      sortable: true,
      width: '11em',
      truncateText: true,
      'data-test-subj': 'content-list-table-column-typeTitle',
    });
    // `resolved` is the field-data variant of the column union, which carries `render`.
    const { render } = resolved as { render: (value: unknown, record: ContentListItem) => unknown };
    expect(render(undefined, { typeTitle: 'Pie' } as unknown as ContentListItem)).toBe('type:Pie');
  });

  it('lets call-site attributes override the baked-in config', () => {
    const resolved = resolveColumn(createElement(TypeColumn, { width: '20em' }));

    expect(resolved).toMatchObject({ field: 'typeTitle', width: '20em' });
  });
});
