/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for the `@kbn/ui-ai-components` external package.
 *
 * Types are defined here (not re-exported from the source) so that declaration
 * generation only depends on the package's peer dependencies (`react`,
 * `@elastic/eui`, `@emotion/react`) and never pulls in the Kibana dependency
 * graph. Build-time validation in `type_validation.ts` ensures these stay in
 * sync with the source types.
 *
 * @see {@link ./type_validation.ts} for the compatibility check.
 */

import type * as React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type {
  DistributiveOmit,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiIconProps,
  IconSize,
} from '@elastic/eui';

/** Visual variant of an AI button. */
export type AiButtonVariant = 'accent' | 'base' | 'empty' | 'outlined';

/** Icons supported by AI buttons and `AiIcon`. */
export type AiButtonIconType =
  | 'addToChat'
  | 'sparkles'
  | 'productAgent'
  | 'aiAssistantLogo'
  | 'inspect';

type AiButtonTextSize = 'xs' | 's' | 'm';

type ButtonDomHandlerKeys = Extract<keyof React.DOMAttributes<HTMLButtonElement>, `on${string}`>;

type RelaxKeys = ButtonDomHandlerKeys | 'buttonRef' | 'type';

type RelaxedOverrides = Pick<
  React.DOMAttributes<HTMLButtonElement | HTMLAnchorElement>,
  ButtonDomHandlerKeys
> & {
  buttonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
  /** HTML button `type`. */
  type?: 'submit' | 'reset' | 'button';
};

type RelaxForButtonOrAnchor<P> = Omit<P, RelaxKeys> & RelaxedOverrides;

/**
 * Props accepted by `AiButton`. The rendered EUI button depends on `variant`
 * and `iconOnly`.
 */
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

/** Props accepted by `AiButtonDefault`. */
export type AiButtonDefaultProps = Extract<
  AiButtonProps,
  { iconOnly?: false; variant?: 'accent' | 'base' }
>;

/** Props accepted by `AiButtonEmpty`. */
export type AiButtonEmptyProps = DistributiveOmit<
  Extract<AiButtonProps, { iconOnly?: false; variant: 'empty' | 'outlined' }>,
  'variant'
>;

/** Props accepted by `AiButtonIcon`. */
export type AiButtonIconProps = DistributiveOmit<
  Extract<AiButtonProps, { iconOnly: true }>,
  'iconOnly'
>;

/** Props accepted by `AiIcon`. */
export interface AiIconProps extends Omit<EuiIconProps, 'type'> {
  iconType: AiButtonIconType;
  size?: IconSize;
}

/** Options for the AI gradient hooks. */
export interface AiButtonGradientOptions {
  readonly variant?: AiButtonVariant;
  readonly iconOnly?: boolean;
}

/** Emotion styles returned by `useAiButtonGradientStyles`. */
export interface AiButtonGradientStyles {
  readonly buttonCss: SerializedStyles;
  readonly labelCss: SerializedStyles;
}

/** Start and end colors of the AI gradient. */
export interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}

/** Values returned by `useSvgAiGradient`. */
export interface SvgAiGradient {
  readonly iconGradientCss?: SerializedStyles;
  readonly gradientId: string;
  readonly colors: AiGradientColors;
}

/** Props accepted by `SvgAiGradientDefs`. */
export interface SvgAiGradientDefsProps {
  readonly gradientId: string;
  readonly colors: AiGradientColors;
}

/** Component declarations (compiled to function declarations in `.d.ts`). */
export declare function AiButton(props: AiButtonProps): React.JSX.Element;
export declare function AiButtonDefault(props: AiButtonDefaultProps): React.JSX.Element;
export declare function AiButtonEmpty(props: AiButtonEmptyProps): React.JSX.Element;
export declare function AiButtonIcon(props: AiButtonIconProps): React.JSX.Element;
export declare function AiIcon(props: AiIconProps): React.JSX.Element;
export declare function SvgAiGradientDefs(props: SvgAiGradientDefsProps): React.JSX.Element;

/** Hook declarations. */
export declare function useAiButtonGradientStyles(
  options?: AiButtonGradientOptions
): AiButtonGradientStyles;
export declare function useSvgAiGradient(options?: AiButtonGradientOptions): SvgAiGradient;
