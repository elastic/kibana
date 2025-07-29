/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps } from '@elastic/eui';

import type {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
} from '@kbn/shared-ux-link-redirect-app-types';

/**
 * A list of services that are consumed by this component.
 */
export interface Services {
  addBasePath: (path: string) => string;
  canAccessFleet: boolean;
}

/**
 * Services that are consumed by this component and any dependencies.
 */
export type NoDataCardServices = Services & RedirectAppLinksServices;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
interface KibanaDependencies {
  coreStart: {
    http: {
      basePath: {
        prepend: (path: string) => string;
      };
    };
    application: {
      capabilities: {
        navLinks: Record<string, boolean>;
      };
    };
  };
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component as well as any dependencies.
 */
export type NoDataCardKibanaDependencies = KibanaDependencies & RedirectAppLinksKibanaDependencies;

/**
 * Props for the `NoDataCard` pure component.
 */
export type NoDataCardComponentProps = Pick<EuiEmptyPromptProps, 'icon'> & {
  /**
   * Title for the card;
   * If not provided, the default will be used
   */
  title?: string;
  /**
   * Description for the card;
   * If not provided, the default will be used
   */
  description?: string;
  /** True if the person has permission to access Fleet, false otherwise */
  canAccessFleet?: boolean;
  /**
   * Provide a string for the button's label;
   * The button will be hidden completely if `isDisabled=true`
   */
  button?: string;
  /**
   * Provide a href for the button;
   */
  href?: string;
  /**
   * Link to the documentation for this card;
   * If not provided, the default will be used
   */
  docsLink?: string;
  /** Callback function for when the button is clicked */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Props for the `NoDataCard` sevice-connected component.
 */
export type NoDataCardProps = NoDataCardComponentProps;
