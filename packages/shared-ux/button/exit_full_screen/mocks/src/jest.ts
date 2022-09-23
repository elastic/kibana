/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ExitFullScreenButtonKibanaDependencies,
  ExitFullScreenButtonServices,
} from '@kbn/shared-ux-button-exit-full-screen-types';

/**
 * Return a Jest mock of the services for the `ExitFullScreenButton` component.
 */
export const getServicesMock = (): ExitFullScreenButtonServices => {
  return {
    setIsFullscreen: jest.fn(),
  };
};

/**
 * Return a Jest mock of the Kibana dependencies for the `ExitFullScreenButton` component.
 */
export const getKibanaDependenciesMock = (): ExitFullScreenButtonKibanaDependencies => {
  return {
    coreStart: {
      chrome: {
        setIsVisible: jest.fn(),
      },
    },
  };
};
