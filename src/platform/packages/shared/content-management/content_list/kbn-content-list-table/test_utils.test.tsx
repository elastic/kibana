/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useContentListConfig, type ContentListItem } from '@kbn/content-list-provider';
import { renderWithContentListProviders, createContentListProviderWrapper } from './test_utils';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

const ConfigProbe = () => {
  const config = useContentListConfig();
  const sampleItem = React.useMemo<UserContentCommonSchema>(
    () => ({
      id: 'sample',
      type: 'test-type',
      attributes: {
        title: 'Sample Item',
      },
      updatedAt: new Date().toISOString(),
      references: [],
    }),
    []
  );
  const transformed = config.dataSource.transform?.(sampleItem);
  const isSame =
    transformed && 'attributes' in sampleItem
      ? transformed.title === sampleItem.attributes.title
      : false;

  return (
    <>
      <div data-test-subj="entity-name">{config.entityName}</div>
      <div data-test-subj="transform-result">{isSame ? 'same' : 'different'}</div>
    </>
  );
};

describe('test_utils', () => {
  it('provides default config and identity transform', async () => {
    await renderWithContentListProviders(<ConfigProbe />);

    expect(screen.getByTestId('entity-name')).toHaveTextContent('item');
    expect(screen.getByTestId('transform-result')).toHaveTextContent('different');
  });

  it('merges provider overrides and respects custom transform', async () => {
    const customTransform = jest.fn(
      (item: UserContentCommonSchema): ContentListItem => ({
        id: item.id,
        title: item.attributes.title,
        type: item.type,
        updatedAt: new Date(item.updatedAt),
      })
    );

    await renderWithContentListProviders(<ConfigProbe />, {
      providerOverrides: {
        entityName: 'dashboard',
        entityNamePlural: 'dashboards',
        dataSource: {
          findItems: async () => ({ items: [], total: 0 }),
          transform: customTransform,
        },
      },
    });

    expect(screen.getByTestId('entity-name')).toHaveTextContent('dashboard');
    // The custom transform preserves the title (attributes.title -> title),
    // so the comparison shows 'same' not 'different'.
    expect(screen.getByTestId('transform-result')).toHaveTextContent('same');
    expect(customTransform).toHaveBeenCalledTimes(1);
  });

  it('creates a reusable wrapper with provided overrides', async () => {
    const wrapper = createContentListProviderWrapper({
      entityName: 'report',
      entityNamePlural: 'reports',
      dataSource: {
        findItems: async () => ({ items: [], total: 0 }),
      },
    });

    await act(async () => {
      render(<ConfigProbe />, { wrapper });
      await Promise.resolve();
    });

    expect(screen.getByTestId('entity-name')).toHaveTextContent('report');
  });
});
