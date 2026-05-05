/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps, ReactNode } from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { EuiButton, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

/**
 * Distributive `Omit` so that the button-vs-anchor discriminated unions used
 * by `EuiButton` / `EuiButtonEmpty` keep their variants instead of collapsing
 * into an intersection that satisfies neither.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Props for the primary action button. Rendered as an `EuiButton`.
 * `color`, `size` and `fill` are controlled by the component.
 */
export type AnnouncementActionPrimaryProps = DistributiveOmit<
  ComponentProps<typeof EuiButton>,
  'color' | 'size' | 'fill'
>;

/**
 * Props for the secondary action button. Rendered as an `EuiButtonEmpty`.
 * `color`, `size` and `flush` are controlled by the component.
 */
export type AnnouncementActionSecondaryProps = DistributiveOmit<
  ComponentProps<typeof EuiButtonEmpty>,
  'color' | 'size' | 'flush'
>;

/**
 * Props spread onto the dismiss `EuiButtonIcon`. `onClick` is controlled by
 * the component (use the `onDismiss` callback prop instead). Every other prop
 * is optional — the component supplies sensible defaults.
 */
export type AnnouncementDismissButtonProps = Partial<
  DistributiveOmit<ComponentProps<typeof EuiButtonIcon>, 'onClick'>
>;

/** Visual size of the announcement. */
export type AnnouncementSize = 's' | 'm' | 'l';

/** HTML element used to render the title. */
export type AnnouncementHeadingElement = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface AnnouncementProps {
  /** Test subject selector applied to the outermost element. */
  'data-test-subj'?: string;
  /** Emotion CSS styles added to the outermost container element. */
  css?: SerializedStyles | SerializedStyles[];
  /** Passed to the outermost container element. */
  className?: string;
  /** Heading shown at the top. */
  title: string;
  /**
   * HTML element used to render the title.
   * @default 'h2'
   */
  headingElement?: AnnouncementHeadingElement;
  /** Supporting copy rendered below the title. */
  text?: ReactNode;
  /**
   * Visual size variant.
   * @default 'm'
   */
  size?: AnnouncementSize;
  /** Action buttons rendered at the bottom. */
  actionProps?: {
    /** Primary call-to-action, rendered as a filled `EuiButton`. */
    primary?: AnnouncementActionPrimaryProps;
    /** Secondary action, rendered as an `EuiButtonEmpty`. */
    secondary?: AnnouncementActionSecondaryProps;
  };
  /** Optional illustration. Wrapped in a square (1:1) container. */
  media?: ReactNode;
  /**
   * When provided, a dismiss button is rendered in the top-right corner and
   * this callback fires when the user activates it.
   */
  onDismiss?: () => void;
  /** Extra props spread onto the dismiss `EuiButtonIcon`. */
  dismissButtonProps?: AnnouncementDismissButtonProps;
  /** Extra content rendered directly below `text`. */
  children?: ReactNode;
}
