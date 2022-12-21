/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MouseEventHandler, HTMLAttributes } from 'react';

/**
 * Abstract external services for this component.
 */
export interface Services {
  /** Function to invoke to set the application to full-screen mode */
  setIsFullscreen: (isFullscreen: boolean) => void;
}

/**
 * Services that are consumed by this component and any dependencies.
 */
export type ExitFullScreenButtonServices = Services;

/**
 * Kibana-specific service types.
 */
export interface KibanaDependencies {
  coreStart: {
    chrome: {
      setIsVisible: (isVisible: boolean) => void;
    };
  };
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component as well as any dependencies.
 */
export type ExitFullScreenButtonKibanaDependencies = KibanaDependencies;

/**
 * Props for the service-enabled `ExitFullScreenButton` component.
 */
export interface ExitFullScreenButtonProps {
  /** Optional handler to call when one exits full-screen mode. */
  onExit?: () => void;
  /** Should the button toggle the Chrome visibility? */
  toggleChrome?: boolean;
}

/**
 * Props for the `ExitFullScreenButton` component.
 */
export interface ExitFullScreenButtonComponentProps
  extends Pick<HTMLAttributes<HTMLDivElement>, 'className'> {
  /** Handler to invoke when one clicks the button. */
  onClick: MouseEventHandler<HTMLButtonElement>;
}
