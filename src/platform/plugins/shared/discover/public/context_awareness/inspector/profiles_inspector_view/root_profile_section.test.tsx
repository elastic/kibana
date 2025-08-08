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
import { RootProfileSection } from './root_profile_section';
import { getContextWithProfileIdMock } from '../../__mocks__';
import type { RootContext } from '../../profiles';
import { SolutionType } from '../../profiles';

const rootContextMock = getContextWithProfileIdMock<RootContext>({
  profileId: 'test-root-profile-id',
  solutionType: SolutionType.Observability,
});

describe('RootProfileSection', () => {
  it('renders the title correctly', () => {
    render(<RootProfileSection rootContext={rootContextMock} />);
    expect(screen.getByText('Root profile')).toBeVisible();
  });

  it('displays the profile ID when provided', () => {
    render(<RootProfileSection rootContext={rootContextMock} />);

    expect(screen.getByText('Profile ID')).toBeVisible();
    expect(screen.getByText('test-root-profile-id')).toBeVisible();
  });

  it('displays the solution type when provided', () => {
    render(<RootProfileSection rootContext={rootContextMock} />);

    expect(screen.getByText('Solution type')).toBeVisible();
    expect(screen.getByText(SolutionType.Observability)).toBeVisible();
  });
});
