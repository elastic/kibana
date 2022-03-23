/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonProps, EuiCardProps } from '@elastic/eui';
import { MouseEventHandler, ReactNode } from 'react';

export type NoDataPageActions = Partial<EuiCardProps> & {
  /**
   * Applies the `Recommended` beta badge and makes the button `fill`
   */
  recommended?: boolean;
  /**
   * Provide just a string for the button's label, or a whole component
   */
  button?: string | ReactNode;
  /**
   * Remapping `onClick` to any element
   */
  onClick?: MouseEventHandler<HTMLElement>;
  /**
   * Category to auto-select within Fleet
   */
  category?: string;
};

export type NoDataPageActionsProps = Record<string, NoDataPageActions>;

export interface NoDataPageProps extends CommonProps {
  /**
   * Single name for the current solution, used to auto-generate the title, logo, description, and button label
   */
  solution: string;
  /**
   * Optionally replace the auto-generated logo
   */
  logo?: string;
  /**
   * Required to set the docs link for the whole solution
   */
  docsLink: string;
  /**
   * Optionally replace the auto-generated page title (h1)
   */
  pageTitle?: string;
  /**
   * An object of `NoDataPageActions` configurations with unique primary keys.
   * Use `elasticAgent` or `beats` as the primary key for pre-configured cards of this type.
   * Otherwise use a custom key that contains `EuiCard` props.
   */
  actions: NoDataPageActionsProps;
}
