/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import type { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

/** Supported visual variants for AI button components. */
export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';

/** Allowed icon types for AI button components. */
export type AiButtonIconType = 'sparkles' | 'productAgent' | 'aiAssistantLogo';

/** Props for the `AiButton` component. */
export type AiButtonProps =
  | (DistributiveOmit<React.ComponentProps<typeof EuiButton>, 'fill' | 'iconType' | 'disabled'> & {
      /** Selects text button vs icon-only button rendering. */
      iconOnly?: false;
      fill?: never;
      variant?: 'base' | 'accent';
      iconType?: AiButtonIconType;
    })
  | (DistributiveOmit<React.ComponentProps<typeof EuiButtonEmpty>, 'iconType' | 'disabled'> & {
      iconOnly?: false;
      variant: 'empty' | 'outlined';
      iconType?: AiButtonIconType;
    })
  | (DistributiveOmit<
      React.ComponentProps<typeof EuiButtonIcon>,
      'display' | 'iconType' | 'disabled'
    > & {
      iconOnly: true;
      display?: never;
      variant?: AiButtonVariant;
      iconType: AiButtonIconType;
      'aria-label': string;
    });
