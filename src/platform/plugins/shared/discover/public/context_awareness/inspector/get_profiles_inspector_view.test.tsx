/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { getProfilesInspectorView } from './get_profiles_inspector_view';
import { getDataSourceContextMock, getRootContextMock } from '../__mocks__';
import type { ContextsAdapter } from '../hooks';

describe('getProfilesInspectorView', () => {
  it('should return the title', () => {
    const { title } = getProfilesInspectorView();
    expect(title).toBe('Profiles');
  });

  it('should return the help text', () => {
    const { help } = getProfilesInspectorView();
    expect(help).toBe('View the active Discover profiles');
  });

  describe('when there are no profiles', () => {
    it('should not show the view', () => {
      const { shouldShow } = getProfilesInspectorView();
      expect(shouldShow?.({ profiles: undefined })).toBe(false);
    });

    it('should return null for the component', () => {
      const { component: Component } = getProfilesInspectorView();

      const { container } = render(<Component title="" adapters={{ profiles: undefined }} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when profiles are available', () => {
    const contextsAdapter: ContextsAdapter = {
      getRootContext: jest.fn().mockReturnValue(getRootContextMock()),
      getDataSourceContext: jest.fn().mockReturnValue(getDataSourceContextMock()),
      getDocumentContexts: jest.fn().mockReturnValue({}),
      openDocDetails: jest.fn(),
    };

    it('should show the view', () => {
      const { shouldShow } = getProfilesInspectorView();
      expect(shouldShow?.({ contexts: contextsAdapter })).toBe(true);
    });

    it('should render the component', async () => {
      const { component: Component } = getProfilesInspectorView();

      render(<Component title="" adapters={{ contexts: contextsAdapter }} />);

      await waitFor(() => expect(screen.getByTestId('profilesInspectorView')).toBeVisible());
    });
  });
});
