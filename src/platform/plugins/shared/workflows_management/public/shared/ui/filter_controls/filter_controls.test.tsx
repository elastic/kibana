/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { FilterControls } from './filter_controls';

const filterGroupProps = jest.fn();

jest.mock('./filter_group', () => ({
  FilterGroup: (props: Record<string, unknown>) => {
    filterGroupProps(props);
    return <div data-test-subj="filterGroupStub" />;
  },
}));

describe('FilterControls', () => {
  const dataViewSpec = {
    id: 'my-adhoc-dv',
    title: '.my-private-index',
    fields: { status: { name: 'status', type: 'string', searchable: true, aggregatable: true } },
  };

  const renderFilterControls = (overrides: Record<string, unknown> = {}) => {
    const dataViews = {
      create: jest.fn().mockResolvedValue({}),
      clearInstanceCache: jest.fn(),
    } as unknown as jest.Mocked<DataViewsPublicPluginStart>;

    render(
      <FilterControls
        dataViewSpec={dataViewSpec as never}
        defaultControls={[{ field_name: 'status' }]}
        services={{ dataViews, storage: Storage }}
        {...overrides}
      />
    );

    return dataViews;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the ad-hoc data view without refreshing its fields', async () => {
    const dataViews = renderFilterControls();

    await waitFor(() => expect(dataViews.create).toHaveBeenCalled());
    // `skipFetchFields` must be true: refreshing would replace the spec's fields with whatever
    // the current user can see on the index, which is nothing without read access to it.
    expect(dataViews.create).toHaveBeenCalledWith(dataViewSpec, true);
  });

  it('forwards the options list suggestions path to the filter group', async () => {
    renderFilterControls({ optionsListSuggestionsPath: '/internal/my_app/suggestions' });

    await waitFor(() => expect(screen.getByTestId('filterGroupStub')).toBeInTheDocument());
    expect(filterGroupProps).toHaveBeenCalledWith(
      expect.objectContaining({ optionsListSuggestionsPath: '/internal/my_app/suggestions' })
    );
  });
});
