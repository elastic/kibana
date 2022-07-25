/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount as enzymeMount } from 'enzyme';
import { ExitFullScreenButtonKibanaProvider, ExitFullScreenButtonProvider } from './services';

export const componentServices = { setIsFullscreen: jest.fn() };
export const componentMount = (element: JSX.Element) =>
  enzymeMount(
    <ExitFullScreenButtonProvider {...componentServices}>{element}</ExitFullScreenButtonProvider>
  );

export const kibanaServices = { coreStart: { chrome: { setIsVisible: jest.fn() } } };
export const kibanaMount = (element: JSX.Element) =>
  enzymeMount(
    <ExitFullScreenButtonKibanaProvider {...kibanaServices}>
      {element}
    </ExitFullScreenButtonKibanaProvider>
  );
