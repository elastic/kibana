/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { CoreTheme } from '@kbn/core/public';
import { KibanaContextProvider } from '../context';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { useKibanaTheme } from './use_theme';
import { of } from 'rxjs';

describe('useKibanaTheme', () => {
  let resultTheme: CoreTheme | undefined;

  beforeEach(() => {
    resultTheme = undefined;
  });

  const InnerComponent: FC = () => {
    const theme = useKibanaTheme();
    useEffect(() => {
      resultTheme = theme;
    }, [theme]);
    return <div>foo</div>;
  };

  it('retrieve CoreTheme when theme service is provided in context', async () => {
    const expectedCoreTheme: CoreTheme = { darkMode: true };

    const themeServiceStart = themeServiceMock.createStartContract();
    themeServiceStart.theme$ = of({ darkMode: true });

    mountWithIntl(
      <KibanaContextProvider services={{ theme: themeServiceStart }}>
        <InnerComponent />
      </KibanaContextProvider>
    );

    expect(resultTheme).toEqual(expectedCoreTheme);
  });

  it('does not throw error when theme service is not provided, default theme applied', async () => {
    const expectedCoreTheme: CoreTheme = { darkMode: false };

    mountWithIntl(
      <KibanaContextProvider>
        <InnerComponent />
      </KibanaContextProvider>
    );

    expect(resultTheme).toEqual(expectedCoreTheme);
  });
});
