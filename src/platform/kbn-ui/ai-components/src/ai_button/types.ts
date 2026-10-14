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
export type AiButtonIconType = 'addToChat' | 'sparkles' | 'productAgent' | 'aiAssistantLogo';
type AiButtonTextSize = 'xs' | 's' | 'm';

/** Event handler prop names from DOMAttributes (onClick, onKeyDown, …). */
type ButtonDomHandlerKeys = Extract<keyof React.DOMAttributes<HTMLButtonElement>, `on${string}`>;

/** Keys to relax: event handlers, ref, and `type` (button vs anchor MIME type clash). */
type RelaxKeys = ButtonDomHandlerKeys | 'buttonRef' | 'type';

/** Relaxed replacements: handlers and ref that accept both element types. */
type RelaxedOverrides = Pick<
  React.DOMAttributes<HTMLButtonElement | HTMLAnchorElement>,
  ButtonDomHandlerKeys
> & {
  buttonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
  /**
   * HTML button `type`. Kept as the button literal union so spreading `AiButtonProps`
   * does not widen to `string` via the anchor MIME `type` from EUI's button|anchor props.
   */
  type?: 'submit' | 'reset' | 'button';
};

/** Makes P accept handlers/ref that work for both button and anchor. */
type RelaxForButtonOrAnchor<P> = Omit<P, RelaxKeys> & RelaxedOverrides;

/** Props for the `AiButton` component. */
export type AiButtonProps =
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<React.ComponentProps<typeof EuiButton>, 'fill' | 'iconType' | 'size'>
    > & {
      iconOnly?: false;
      withToolTip?: never;
      toolTipContent?: never;
      fill?: never;
      size?: AiButtonTextSize;
      variant?: 'base' | 'accent';
      iconType?: AiButtonIconType;
    })
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<React.ComponentProps<typeof EuiButtonEmpty>, 'iconType'>
    > & {
      iconOnly?: false;
      withToolTip?: never;
      toolTipContent?: never;
      variant: 'empty' | 'outlined';
      iconType?: AiButtonIconType;
    })
  | (RelaxForButtonOrAnchor<
      DistributiveOmit<
        React.ComponentProps<typeof EuiButtonIcon>,
        'display' | 'iconType' | 'children'
      >
    > & {
      iconOnly: true;
      display?: never;
      children?: never;
      variant?: AiButtonVariant;
      iconType: AiButtonIconType;
      'aria-label': string;
      /** Wraps the icon button in a tooltip when `true`. Only applies to icon-only buttons. */
      withToolTip?: boolean;
      /** Tooltip content when `withToolTip` is `true`. Falls back to `aria-label` when omitted. */
      toolTipContent?: React.ReactNode;
    });
