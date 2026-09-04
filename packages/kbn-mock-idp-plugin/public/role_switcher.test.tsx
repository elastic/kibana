/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MOCK_IDP_REALM_NAME, MOCK_IDP_REALM_TYPE } from '@kbn/mock-idp-utils/src/constants';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { DATA_TEST_SUBJ_ROLE_SWITCHER_BUTTON, RoleSwitcher } from './role_switcher';

const SUPPORTED_ROLES = ['admin', 'editor', 'viewer'];

const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({
    username: 'elastic',
    full_name: 'Elastic User',
    email: 'elastic@example.com',
    roles: ['admin'],
    authentication_provider: {
      type: MOCK_IDP_REALM_TYPE,
      name: MOCK_IDP_REALM_NAME,
    },
    ...overrides,
  } as AuthenticatedUser);

const resolvePath = (pathOrOptions: unknown): string => {
  if (typeof pathOrOptions === 'string') {
    return pathOrOptions;
  }
  if (pathOrOptions && typeof pathOrOptions === 'object' && 'path' in pathOrOptions) {
    return String(pathOrOptions.path);
  }
  throw new Error(`unexpected path: ${String(pathOrOptions)}`);
};

const renderRoleSwitcher = (user: AuthenticatedUser = createMockUser()) => {
  const coreStart = coreMock.createStart();
  coreStart.http.get.mockImplementation(async (pathOrOptions) => {
    const path = resolvePath(pathOrOptions);
    if (path === '/internal/security/me') {
      return user;
    }
    if (path === '/mock_idp/supported_roles') {
      return { roles: SUPPORTED_ROLES };
    }
    throw new Error(`unexpected path: ${path}`);
  });

  const renderResult = renderWithI18n(
    <KibanaContextProvider services={coreStart}>
      <RoleSwitcher />
    </KibanaContextProvider>
  );

  return { ...renderResult, coreStart };
};

describe('RoleSwitcher', () => {
  it('renders a badge labeled with the current role', async () => {
    renderRoleSwitcher();

    const button = await screen.findByTestId(DATA_TEST_SUBJ_ROLE_SWITCHER_BUTTON);
    expect(button).toHaveTextContent('admin');
    expect(button).toHaveAttribute('aria-label', 'Switch role');
  });

  it('does not render when the user is not authenticated with Mock IDP', async () => {
    const { coreStart } = renderRoleSwitcher(
      createMockUser({
        authentication_provider: { type: 'basic', name: 'basic' },
      })
    );

    await waitFor(() => {
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/me');
    });
    expect(screen.queryByTestId(DATA_TEST_SUBJ_ROLE_SWITCHER_BUTTON)).not.toBeInTheDocument();
  });
});
