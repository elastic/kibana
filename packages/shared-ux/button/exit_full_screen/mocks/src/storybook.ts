/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type {
  ExitFullScreenButtonProps as Props,
  ExitFullScreenButtonServices,
} from '@kbn/shared-ux-button-exit-full-screen-types';

type PropArguments = Pick<Props, 'toggleChrome'>;

export type Params = Record<keyof PropArguments, any>;

export class StorybookMock extends AbstractStorybookMock<
  PropArguments,
  {},
  ExitFullScreenButtonServices
> {
  propArguments = {
    toggleChrome: {
      control: 'boolean',
      defaultValue: true,
    },
  };

  serviceArguments = {};
  dependencies = [];

  getServices(): ExitFullScreenButtonServices {
    return {
      setIsFullscreen: (isFullscreen: boolean) => {
        action('setIsFullscreen')(isFullscreen);
      },
    };
  }
}
