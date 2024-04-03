/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  ExitFullScreenButtonStorybookMock,
  type ExitFullScreenButtonStorybookParams,
} from '../mocks';

import { ExitFullScreenButtonProvider } from './services';
import { ExitFullScreenButton as Component } from './exit_full_screen_button';

import mdx from '../README.mdx';

export default {
  title: 'Button/Exit Full Screen Button',
  description:
    'A button that floats over the plugin workspace and allows one to exit "full screen" mode.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new ExitFullScreenButtonStorybookMock();

export const ExitFullScreenButton = (params: ExitFullScreenButtonStorybookParams) => {
  return (
    <ExitFullScreenButtonProvider {...mock.getServices()}>
      <Component {...mock.getProps(params)} />
    </ExitFullScreenButtonProvider>
  );
};

ExitFullScreenButton.argTypes = mock.getArgumentTypes();
