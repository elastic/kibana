/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCardProps } from '@elastic/eui';
import { MouseEventHandler, ReactNode } from 'react';

export type NoDataCardProps = Partial<Omit<EuiCardProps, 'layout'>> & {
  /**
   * Applies the `Recommended` beta badge and makes the button `fill`
   */
  recommended?: boolean;
  /**
   * Provide just a string for the button's label, or a whole component;
   * The button will be hidden completely if `isDisabled=true`
   */
  button?: string | ReactNode;
  /**
   * Remapping `onClick` to any element
   */
  onClick?: MouseEventHandler<HTMLElement>;
  /**
   * Description for the card;
   * If not provided, the default will be used
   */
  description?: string | ReactNode;
};

export type ElasticAgentCardProps = NoDataCardProps & {
  /**
   * Category to auto-select within Fleet
   */
  category?: string;
};
