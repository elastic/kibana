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
type AiButtonTextSize = 'xs' | 's' | 'm';

/** Keys to relax: derived from React types so handlers work for both button and anchor. */
type RelaxKeys =
  | Extract<keyof React.DOMAttributes<HTMLButtonElement>, `on${string}`>
  | 'buttonRef'
  | Exclude<
      keyof React.ButtonHTMLAttributes<HTMLButtonElement>,
      keyof React.AnchorHTMLAttributes<HTMLAnchorElement>
    >;

/** Relaxed replacements: handlers and ref that accept both element types. */
type RelaxedOverrides = Pick<
  React.DOMAttributes<HTMLButtonElement | HTMLAnchorElement>,
  Extract<keyof React.DOMAttributes<HTMLButtonElement>, `on${string}`>
> & {
  buttonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
};

/** Makes P accept handlers/ref that work for both button and anchor (no hardcoding). */
type RelaxForButtonOrAnchor<P> = Omit<P, RelaxKeys> & RelaxedOverrides;

/** Props for the `AiButton` component. */
export type AiButtonProps =
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<
        React.ComponentProps<typeof EuiButton>,
        'fill' | 'iconType' | 'disabled' | 'size'
      >
    > & {
      iconOnly?: false;
      fill?: never;
      size?: AiButtonTextSize;
      variant?: 'base' | 'accent';
      iconType?: AiButtonIconType;
    })
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<React.ComponentProps<typeof EuiButtonEmpty>, 'iconType' | 'disabled'>
    > & {
      iconOnly?: false;
      variant: 'empty' | 'outlined';
      iconType?: AiButtonIconType;
    })
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<
        React.ComponentProps<typeof EuiButtonIcon>,
        'display' | 'iconType' | 'disabled'
      >
    > & {
      iconOnly: true;
      display?: never;
      variant?: AiButtonVariant;
      iconType: AiButtonIconType;
      'aria-label': string;
    });
