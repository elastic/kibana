/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { render, waitFor } from '@testing-library/react';
import { of, BehaviorSubject } from 'rxjs';
import { useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { KibanaTheme } from '@kbn/react-kibana-context-common';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { KibanaRootContextProvider } from './root_provider';

describe('KibanaRootContextProvider', () => {
  let euiTheme: UseEuiTheme | undefined;
  let i18nMock: I18nStart;
  let userProfile: UserProfileService;
  let executionContext: ExecutionContextStart;

  beforeEach(() => {
    euiTheme = undefined;
    i18nMock = i18nServiceMock.createStartContract();
    userProfile = userProfileServiceMock.createStart();
    executionContext = executionContextServiceMock.createStartContract();
  });

  const InnerComponent: FC = () => {
    const theme = useEuiTheme();
    useEffect(() => {
      euiTheme = theme;
    }, [theme]);
    return <div>foo</div>;
  };

  it('exposes the EUI theme provider', async () => {
    const coreTheme: KibanaTheme = { darkMode: true, name: 'borealis' };

    render(
      <KibanaRootContextProvider
        i18n={i18nMock}
        userProfile={userProfile}
        executionContext={executionContext}
        theme={{ theme$: of(coreTheme) }}
      >
        <InnerComponent />
      </KibanaRootContextProvider>
    );

    await waitFor(() => {
      expect(euiTheme).toBeDefined();
    });

    expect(euiTheme!.colorMode).toEqual('DARK');
  });

  it('propagates changes of the coreTheme observable', async () => {
    const coreTheme$ = new BehaviorSubject<KibanaTheme>({ darkMode: true, name: 'borealis' });

    render(
      <KibanaRootContextProvider
        i18n={i18nMock}
        userProfile={userProfile}
        executionContext={executionContext}
        theme={{ theme$: coreTheme$ }}
      >
        <InnerComponent />
      </KibanaRootContextProvider>
    );

    // Wait for initial render with dark theme
    await waitFor(() => {
      expect(euiTheme).toBeDefined();
    });

    expect(euiTheme!.colorMode).toEqual('DARK');

    // Update theme to light mode
    act(() => {
      coreTheme$.next({ darkMode: false, name: 'borealis' });
    });

    // Wait for the theme to update
    await waitFor(() => {
      expect(euiTheme!.colorMode).toEqual('LIGHT');
    });
  });
});
