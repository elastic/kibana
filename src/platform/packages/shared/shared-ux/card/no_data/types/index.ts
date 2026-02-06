/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps } from '@elastic/eui';

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
export type NoDataCardServices = Services;

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
export type NoDataCardKibanaDependencies = KibanaDependencies;

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
  description?: React.ReactNode;
  /** True if the person has access to Fleet, false otherwise */
  canAccessFleet?: boolean;
  /**
   * Provide a string for the button's label;
   * The button will be hidden completely if `canAccessFleet=false` or `hideActionButton=true`
   */
  buttonText?: string;
  /**
   * Provide a boolean to disable the button;
   * The button will be disabled if `buttonIsDisabled` or `disabledButtonTooltipText`is provided otherwise the button will be hidden completely
   */
  buttonIsDisabled?: boolean;
  /**
   * Provide a tooltip text for the disabled button;
   * The button will be disabled if `buttonIsDisabled` or `disabledButtonTooltipText` is provided otherwise the button will be hidden completely
   */
  disabledButtonTooltipText?: string;
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
  /** Data test subject for the card */
  'data-test-subj'?: string;
};

/**
 * Props for the `NoDataCard` sevice-connected component.
 */
export type NoDataCardProps = NoDataCardComponentProps;
