/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { ContentListItem } from '@kbn/content-list';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { DataViewCell } from './data_view_cell';

type CellItem = ContentListItem<{ indexPatternId?: string; dataViewSpec?: DataViewSpec }>;

const buildItem = (overrides: Partial<CellItem> = {}): CellItem =>
  ({
    id: 'group-1',
    type: EVENT_ANNOTATION_GROUP_TYPE,
    updatedAt: '2024-01-15T10:30:00.000Z',
    references: [],
    attributes: {
      title: 'Group',
      description: '',
      indexPatternId: undefined,
    },
    ...overrides,
  } as CellItem);

const renderCell = (item: CellItem, dataViewNameMap: Record<string, string> = {}) =>
  render(
    <I18nProvider>
      <DataViewCell item={item} dataViewNameMap={dataViewNameMap} />
    </I18nProvider>
  );

describe('DataViewCell', () => {
  it('renders the ad-hoc dataViewSpec name when present (highest precedence)', () => {
    renderCell(
      buildItem({
        dataViewSpec: { id: 'spec-id', title: 'spec-title', name: 'Ad-hoc DV' } as DataViewSpec,
        indexPatternId: 'lookup-hit',
      }),
      { 'lookup-hit': 'Stored DV' }
    );
    // Spec name wins over the name-map lookup so ad-hoc DVs display their
    // own label even when an unrelated entry exists in the map.
    expect(screen.getByText('Ad-hoc DV')).toBeInTheDocument();
    expect(screen.queryByText('Stored DV')).not.toBeInTheDocument();
  });

  it('falls back to the dataViewNameMap lookup when no spec is present', () => {
    renderCell(buildItem({ indexPatternId: 'lookup-hit' }), { 'lookup-hit': 'Stored DV' });
    expect(screen.getByText('Stored DV')).toBeInTheDocument();
  });

  it('renders the "No longer exists" marker when neither spec nor map resolves', () => {
    renderCell(buildItem({ indexPatternId: 'missing' }), {});
    expect(screen.getByText('No longer exists')).toBeInTheDocument();
  });

  it('renders the "No longer exists" marker when indexPatternId is also missing', () => {
    renderCell(buildItem({}));
    expect(screen.getByText('No longer exists')).toBeInTheDocument();
  });
});
