/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import type { DecoratorFn } from '@storybook/react';
import { KibanaContextProvider } from '@kbn/react-kibana-context';

import 'core_styles';
import { BehaviorSubject } from 'rxjs';
import { CoreTheme } from '@kbn/core-theme-browser';

const theme$ = new BehaviorSubject<CoreTheme>({ darkMode: false });

/**
 * Storybook decorator using the `KibanaContextProvider`. Uses the value from
 * `globals` provided by the Storybook theme switcher to set the `colorMode`.
 */
const KibanaContextDecorator: DecoratorFn = (storyFn, { globals }) => {
  const colorMode = globals.euiTheme === 'v8.dark' ? 'dark' : 'light';

  useEffect(() => {
    theme$.next({ darkMode: colorMode === 'dark' });
  }, [colorMode]);

  return <KibanaContextProvider {...{ theme$ }}>{storyFn()}</KibanaContextProvider>;
};

export const decorators = [KibanaContextDecorator];
