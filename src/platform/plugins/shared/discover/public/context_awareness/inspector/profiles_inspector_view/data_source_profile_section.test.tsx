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
import { DataSourceProfileSection } from './data_source_profile_section';
import { getContextWithProfileIdMock } from '../../__mocks__';
import { DataSourceCategory, type DataSourceContext } from '../../profiles';

const dataSourceContext = getContextWithProfileIdMock<DataSourceContext>({
  profileId: 'test-profile-id',
  category: DataSourceCategory.Logs,
});

describe('DataSourceProfileSection', () => {
  it('renders the title correctly', () => {
    render(<DataSourceProfileSection dataSourceContext={dataSourceContext} />);
    expect(screen.getByText('Data source profile')).toBeVisible();
  });

  it('displays the profile ID when provided', () => {
    render(<DataSourceProfileSection dataSourceContext={dataSourceContext} />);

    expect(screen.getByText('Profile ID')).toBeVisible();
    expect(screen.getByText('test-profile-id')).toBeVisible();
  });

  it('displays the category when provided', () => {
    render(<DataSourceProfileSection dataSourceContext={dataSourceContext} />);

    expect(screen.getByText('Category')).toBeVisible();
    expect(screen.getByText(DataSourceCategory.Logs)).toBeVisible();
  });
});
