/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MouseEventHandler, HTMLAttributes } from 'react';
import { Observable } from 'rxjs';
import { CustomBranding } from '@kbn/core-custom-branding-common';

/**
 * Abstract external services for this component.
 */
export interface Services {
  /** Function to invoke to set the application to full-screen mode */
  setIsFullscreen: (isFullscreen: boolean) => void;
  /** Observable that emits the value of custom branding, if set*/
  customBranding$: Observable<CustomBranding>;
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
    customBranding: {
      customBranding$: Observable<CustomBranding>;
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
  /** If set, custom logo is displayed instead of Elastic logo */
  customLogo?: string;
}
