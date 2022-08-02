/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { of, BehaviorSubject } from 'rxjs';
import { useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core/public';
import { toMountPoint } from './to_mount_point';

describe('toMountPoint', () => {
  let euiTheme: UseEuiTheme | undefined;

  beforeEach(() => {
    euiTheme = undefined;
  });

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
    const theme$ = of<CoreTheme>({ darkMode: true });
    const mount = toMountPoint(<InnerComponent />, { theme$ });

    const targetEl = document.createElement('div');
    mount(targetEl);

    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('DARK');
  });

  it('propagates changes of the theme$ observable', async () => {
    const theme$ = new BehaviorSubject<CoreTheme>({ darkMode: true });

    const mount = toMountPoint(<InnerComponent />, { theme$ });

    const targetEl = document.createElement('div');
    mount(targetEl);

    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('DARK');

    await act(async () => {
      theme$.next({ darkMode: false });
    });
    await flushPromises();

    expect(euiTheme!.colorMode).toEqual('LIGHT');
  });
});
