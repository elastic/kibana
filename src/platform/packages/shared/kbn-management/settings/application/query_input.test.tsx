/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Query } from '@elastic/eui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';

import { QueryInput } from './query_input';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { categorizeFields } from '@kbn/management-settings-utilities';

const query = Query.parse('');
const settings = getSettingsMock();
const categories = Object.keys(
  categorizeFields(
    getFieldDefinitions(settings, { isCustom: () => false, isOverridden: () => false })
  )
);

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('Search', () => {
  it('should render normally', async () => {
    const onQueryChange = () => {};
    const { container } = renderWithI18n(<QueryInput {...{ categories, query, onQueryChange }} />);

    expect(container).toMatchSnapshot();
  });

  it('should call parent function when query is changed', async () => {
    const onQueryChange = jest.fn();
    renderWithI18n(<QueryInput {...{ categories, query, onQueryChange }} />);

    const searchBar = screen.getByTestId('settingsSearchBar');
    await user.type(searchBar, 'new filter');

    expect(onQueryChange).toHaveBeenCalled();
  });

  it('should handle query parse error', async () => {
    const onQueryChange = jest.fn();
    renderWithI18n(<QueryInput {...{ categories, query }} onQueryChange={onQueryChange} />);

    const searchBar = screen.getByTestId('settingsSearchBar');

    // Send invalid query
    await user.type(searchBar, '?');

    expect(onQueryChange).toHaveBeenCalled();
    expect(screen.getByText(/Unable to parse query/)).toBeInTheDocument();

    // Send valid query to ensure component can recover from invalid query
    await user.clear(searchBar);
    await user.type(searchBar, 'dateFormat');

    expect(screen.queryByText(/Unable to parse query/)).not.toBeInTheDocument();
  });
});
