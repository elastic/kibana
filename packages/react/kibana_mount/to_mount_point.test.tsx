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
import { of, BehaviorSubject } from 'rxjs';
import { useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core/public';
import { toMountPoint } from './to_mount_point';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';

describe('toMountPoint', () => {
  let euiTheme: UseEuiTheme;
  const i18n = i18nServiceMock.createStartContract();
  const analytics = analyticsServiceMock.createAnalyticsServiceStart();
  const userProfile = userProfileServiceMock.createStart();

  const InnerComponent: FC = () => {
    const theme = useEuiTheme();
    useEffect(() => {
      euiTheme = theme;
    }, [theme]);
    return <div>foo</div>;
  };

  const flushPromises = async () => {
    await new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => resolve(), 20);
      } catch (error) {
        reject(error);
      }
    });
  };

  it('exposes the euiTheme when `theme$` is provided', async () => {
    const theme = { theme$: of<CoreTheme>({ darkMode: true, name: 'amsterdam' }) };
    const mount = toMountPoint(<InnerComponent />, { theme, i18n, analytics, userProfile });

    const targetEl = document.createElement('div');
    mount(targetEl);

    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('DARK');
  });

  it('propagates changes of the theme$ observable', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>({ darkMode: true, name: 'amsterdam' });

    const mount = toMountPoint(<InnerComponent />, {
      theme: { theme$ },
      i18n,
      analytics,
      userProfile,
    });

    const targetEl = document.createElement('div');
    mount(targetEl);

    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('DARK');

    await act(async () => {
      theme$.next({ darkMode: false, name: 'amsterdam' });
    });
    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('LIGHT');
  });
});
