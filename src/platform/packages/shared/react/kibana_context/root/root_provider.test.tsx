/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import type { ReactWrapper } from 'enzyme';
import { of, BehaviorSubject } from 'rxjs';
import { useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { KibanaTheme } from '@kbn/react-kibana-context-common';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { I18nStart } from '@kbn/core-i18n-browser';
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

  const flushPromises = async () => {
    await new Promise<void>(async (resolve, reject) => {
      try {
        setImmediate(() => resolve());
      } catch (error) {
        reject(error);
      }
    });
  };

  const InnerComponent: FC = () => {
    const theme = useEuiTheme();
    useEffect(() => {
      euiTheme = theme;
    }, [theme]);
    return <div>foo</div>;
  };

  const refresh = async (wrapper: ReactWrapper<unknown>) => {
    await act(async () => {
      await flushPromises();
      wrapper.update();
    });
  };

  it('exposes the EUI theme provider', async () => {
    const coreTheme: KibanaTheme = { darkMode: true, name: 'amsterdam' };

    const wrapper = mountWithIntl(
      <KibanaRootContextProvider
        i18n={i18nMock}
        userProfile={userProfile}
        executionContext={executionContext}
        theme={{ theme$: of(coreTheme) }}
      >
        <InnerComponent />
      </KibanaRootContextProvider>
    );

    await refresh(wrapper);

    expect(euiTheme!.colorMode).toEqual('DARK');
  });

  it('propagates changes of the coreTheme observable', async () => {
    const coreTheme$ = new BehaviorSubject<KibanaTheme>({ darkMode: true, name: 'amsterdam' });

    const wrapper = mountWithIntl(
      <KibanaRootContextProvider
        i18n={i18nMock}
        userProfile={userProfile}
        executionContext={executionContext}
        theme={{ theme$: coreTheme$ }}
      >
        <InnerComponent />
      </KibanaRootContextProvider>
    );

    await refresh(wrapper);

    expect(euiTheme!.colorMode).toEqual('DARK');

    await act(async () => {
      coreTheme$.next({ darkMode: false, name: 'amsterdam' });
    });

    await refresh(wrapper);

    expect(euiTheme!.colorMode).toEqual('LIGHT');
  });
});
