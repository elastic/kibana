/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ReactNode } from 'react';
import { type EuiCallOutProps } from '@elastic/eui';

export type KbnCalloutProps = Omit<
  EuiCallOutProps,
  'color' | 'iconType' | 'title' | 'children' | 'actionProps'
> & {
  title: ReactNode;
  /**
   * Use sparingly. Use `text` and `actionProps` instead where possible.
   */
  children?: ReactNode;
  /**
   * Props for primary and secondary actions within the toast.
   * Secondary actions can only be rendered in combination with a primary action.
   */
  actionProps?:
    | { primary?: NonNullable<EuiCallOutProps['actionProps']>['primary']; secondary?: never }
    | {
        primary: NonNullable<NonNullable<EuiCallOutProps['actionProps']>['primary']>;
        secondary?: NonNullable<EuiCallOutProps['actionProps']>['secondary'];
      };
};
