/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock, ArgumentParams } from '@kbn/shared-ux-storybook-mock';
import { of } from 'rxjs';
import type { ExitFullScreenButtonProps as Props, ExitFullScreenButtonServices } from '../types';

type PropArguments = Pick<Props, 'toggleChrome'>;

/**
 * Argument parameters for the `ExitFullScreenButton` Storybook mock.
 */
export type Params = ArgumentParams<PropArguments>;

/**
 * Storybook mocks for the `ExitFullScreenButton` component.
 */
export class StorybookMock extends AbstractStorybookMock<
  Props,
  ExitFullScreenButtonServices,
  PropArguments,
  {}
> {
  propArguments = {
    toggleChrome: {
      control: 'boolean',
      defaultValue: true,
    },
  };

  serviceArguments = {};
  dependencies = [];

  getProps(params?: Params): Props {
    return {
      toggleChrome: this.getArgumentValue('toggleChrome', params),
      onExit: action('onExit'),
    };
  }

  getServices(): ExitFullScreenButtonServices {
    return {
      setIsFullscreen: (isFullscreen: boolean) => {
        action('setIsFullscreen')(isFullscreen);
      },
      customBranding$: of({}),
    };
  }
}
