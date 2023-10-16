/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Query } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act, waitFor } from '@testing-library/react';

import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';
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

describe('Search', () => {
  it('should render normally', async () => {
    const onQueryChange = () => {};
    const component = shallowWithI18nProvider(
      <QueryInput {...{ categories, query, onQueryChange }} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should call parent function when query is changed', async () => {
    // This test is brittle as it knows about implementation details
    // (EuiFieldSearch uses onKeyup instead of onChange to handle input)
    const onQueryChange = jest.fn();
    const component = mountWithI18nProvider(
      <QueryInput {...{ categories, query, onQueryChange }} />
    );
    findTestSubject(component, 'settingsSearchBar').simulate('keyup', {
      target: { value: 'new filter' },
    });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('should handle query parse error', async () => {
    const onQueryChange = jest.fn();
    const component = mountWithI18nProvider(
      <QueryInput {...{ categories, query }} onQueryChange={onQueryChange} />
    );

    const searchBar = findTestSubject(component, 'settingsSearchBar');

    // Send invalid query
    act(() => {
      searchBar.simulate('keyup', { target: { value: '?' } });
    });

    expect(onQueryChange).toHaveBeenCalledTimes(1);

    waitFor(() => {
      expect(component.contains('Unable to parse query')).toBe(true);
    });

    // Send valid query to ensure component can recover from invalid query
    act(() => {
      searchBar.simulate('keyup', { target: { value: 'dateFormat' } });
    });

    expect(onQueryChange).toHaveBeenCalledTimes(2);

    waitFor(() => {
      expect(component.contains('Unable to parse query')).toBe(false);
    });
  });
});
