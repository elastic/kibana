/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { ExitFullScreenButtonProvider } from './services';
import { ExitFullScreenButton as ExitFullScreenButtonComponent } from './exit_full_screen_button.component';
import { ExitFullScreenButton } from './exit_full_screen_button';
import mdx from '../README.mdx';

export default {
  title: 'Exit Full Screen Button',
  description:
    'A button that floats over the plugin workspace and allows one to exit "full screen" mode.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = ({ toggleChrome = true }: { toggleChrome: boolean }) => {
  return (
    <ExitFullScreenButtonProvider setIsFullscreen={action('setIsFullscreen')}>
      <ExitFullScreenButton onExit={action('onExit')} toggleChrome={toggleChrome} />
    </ExitFullScreenButtonProvider>
  );
};

ConnectedComponent.argTypes = {
  toggleChrome: {
    control: 'boolean',
    defaultValue: true,
  },
};

export const PureComponent = () => {
  return <ExitFullScreenButtonComponent onClick={action('onClick')} />;
};
