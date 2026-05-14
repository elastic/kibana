/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import {
  ButtonRegular,
  ButtonFill,
  ButtonDisabled,
  ButtonWithIcon,
  ButtonEmptyRegular,
  ButtonEmptyDisabled,
  ButtonEmptyWithIcon,
  ButtonIconRegular,
} from './button';
import {
  SwitchRegular,
  SwitchDisabled,
  SwitchCompressed,
  SwitchMini,
  SwitchNoLabel,
} from './switch';

/**
 * A single variant of an EUI component (e.g. a specific icon type or button style).
 */
export interface EuiComponentVariant {
  /** Display label in the menu (e.g. "accessibility" for an icon type). */
  label: string;
  /** The JSX element to render for this variant. */
  element: ReactElement;
  /**
   * When true, the component is rendered with a live React tree instead of
   * a static clone so that event handlers (e.g. switch toggle) keep working.
   */
  interactive?: boolean;
}

/**
 * Catalog entry for an EUI component that can be inserted via design tools.
 */
export interface EuiLibraryEntry {
  /** Short label for the context menu (e.g. "Button"). */
  label: string;
  /** Icon to show in the context menu. */
  icon?: string;
  /** The JSX element to render with default props. */
  element: ReactElement;
  /**
   * When present, the component has multiple variants that should be shown
   * in a nested sub-menu. If absent, clicking inserts with the default element.
   */
  variants?: EuiComponentVariant[];
  /**
   * When true, the component is rendered with a live React tree instead of
   * a static clone so that event handlers keep working.
   */
  interactive?: boolean;
}

const buttonVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <ButtonRegular /> },
  { label: 'Fill', element: <ButtonFill /> },
  { label: 'Disabled', element: <ButtonDisabled /> },
  { label: 'With Icon', element: <ButtonWithIcon /> },
  { label: 'Empty', element: <ButtonEmptyRegular /> },
  { label: 'Empty Disabled', element: <ButtonEmptyDisabled /> },
  { label: 'Empty With Icon', element: <ButtonEmptyWithIcon /> },
  { label: 'Icon Only', element: <ButtonIconRegular /> },
];

const switchVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <SwitchRegular />, interactive: true },
  { label: 'Disabled', element: <SwitchDisabled /> },
  { label: 'Compressed', element: <SwitchCompressed />, interactive: true },
  { label: 'Mini', element: <SwitchMini />, interactive: true },
  { label: 'No Label', element: <SwitchNoLabel />, interactive: true },
];

/**
 * Curated catalog of EUI components available for insertion via design tools.
 * Each entry uses JSX to define the rendered element directly.
 */
export const EUI_LIBRARY: EuiLibraryEntry[] = [
  {
    label: 'Button',
    element: <ButtonRegular />,
    variants: buttonVariants,
  },
  {
    label: 'Switch',
    element: <SwitchRegular />,
    interactive: true,
    variants: switchVariants,
  },
];
