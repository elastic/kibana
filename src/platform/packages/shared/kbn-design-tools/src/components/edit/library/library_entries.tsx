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
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFieldText,
  EuiHealth,
  EuiIcon,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiStat,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

/**
 * A single variant of an EUI component (e.g. a specific icon type or button style).
 */
export interface EuiComponentVariant {
  /** Display label in the menu (e.g. "accessibility" for an icon type). */
  label: string;
  /** The JSX element to render for this variant. */
  element: ReactElement;
}

/**
 * Catalog entry for an EUI component that can be inserted via design tools.
 */
export interface EuiLibraryEntry {
  /** Short label for the context menu (e.g. "Button"). */
  label: string;
  /** Icon to show in the context menu. */
  icon: string;
  /** The JSX element to render with default props. */
  element: ReactElement;
  /**
   * When present, the component has multiple variants that should be shown
   * in a nested sub-menu. If absent, clicking inserts with the default element.
   */
  variants?: EuiComponentVariant[];
}

const ICON_TYPES = [
  'accessibility',
  'alert',
  'apps',
  'arrowDown',
  'arrowLeft',
  'arrowRight',
  'arrowUp',
  'bell',
  'bolt',
  'bookmark',
  'brush',
  'bug',
  'calendar',
  'check',
  'clock',
  'cloudSunny',
  'compute',
  'copy',
  'cross',
  'database',
  'document',
  'download',
  'email',
  'empty',
  'error',
  'expand',
  'eye',
  'faceHappy',
  'filter',
  'flag',
  'folder',
  'gear',
  'globe',
  'heart',
  'home',
  'image',
  'indexOpen',
  'link',
  'lock',
  'logstashInput',
  'magnifyWithPlus',
  'mapMarker',
  'menu',
  'minimize',
  'moon',
  'node',
  'package',
  'pencil',
  'pin',
  'play',
  'plus',
  'questionInCircle',
  'refresh',
  'search',
  'share',
  'star',
  'starEmpty',
  'tag',
  'trash',
  'user',
  'warning',
  'wrench',
] as const;

const iconVariants: EuiComponentVariant[] = ICON_TYPES.map((type) => ({
  label: type,
  element: <EuiIcon type={type} aria-hidden={true} />,
}));

const BUTTON_COLORS = ['primary', 'success', 'warning', 'danger', 'text'] as const;

const buttonVariants: EuiComponentVariant[] = BUTTON_COLORS.map((color) => ({
  label: color,
  element: <EuiButton color={color}>Button</EuiButton>,
}));

const buttonEmptyVariants: EuiComponentVariant[] = BUTTON_COLORS.map((color) => ({
  label: color,
  element: <EuiButtonEmpty color={color}>Button</EuiButtonEmpty>,
}));

const BADGE_COLORS = ['default', 'primary', 'success', 'warning', 'danger', 'hollow'] as const;

const badgeVariants: EuiComponentVariant[] = BADGE_COLORS.map((color) => ({
  label: color,
  element: <EuiBadge color={color}>Badge</EuiBadge>,
}));

const CALLOUT_COLORS = ['primary', 'success', 'warning', 'danger'] as const;

const calloutVariants: EuiComponentVariant[] = CALLOUT_COLORS.map((color) => ({
  label: color,
  element: (
    <EuiCallOut color={color} title="Callout title">
      Callout body text.
    </EuiCallOut>
  ),
}));

const AVATAR_SIZES = ['s', 'm', 'l', 'xl'] as const;

const avatarVariants: EuiComponentVariant[] = AVATAR_SIZES.map((size) => ({
  label: `size ${size}`,
  element: <EuiAvatar name="User" size={size} />,
}));

const PROGRESS_SIZES = ['xs', 's', 'm', 'l'] as const;

const progressVariants: EuiComponentVariant[] = PROGRESS_SIZES.map((size) => ({
  label: `size ${size}`,
  element: <EuiProgress value={60} max={100} size={size} />,
}));

/**
 * Curated catalog of EUI components available for insertion via design tools.
 * Each entry uses JSX to define the rendered element directly.
 */
export const EUI_LIBRARY: EuiLibraryEntry[] = [
  {
    label: 'Button',
    icon: 'play',
    element: <EuiButton>Button</EuiButton>,
    variants: buttonVariants,
  },
  {
    label: 'Button Empty',
    icon: 'minusInCircle',
    element: <EuiButtonEmpty>Button</EuiButtonEmpty>,
    variants: buttonEmptyVariants,
  },
  {
    label: 'Button Icon',
    icon: 'plusInCircle',
    element: <EuiButtonIcon iconType="plus" aria-label="Action" />,
    variants: ICON_TYPES.slice(0, 20).map((type) => ({
      label: type,
      element: <EuiButtonIcon iconType={type} aria-label={type} />,
    })),
  },
  {
    label: 'Icon',
    icon: 'starEmpty',
    element: <EuiIcon type="star" aria-hidden={true} />,
    variants: iconVariants,
  },
  {
    label: 'Badge',
    icon: 'tag',
    element: <EuiBadge>Badge</EuiBadge>,
    variants: badgeVariants,
  },
  {
    label: 'Card',
    icon: 'document',
    element: <EuiCard title="Card title" description="Card description text goes here." />,
  },
  {
    label: 'Callout',
    icon: 'alert',
    element: <EuiCallOut title="Callout title">Callout body text.</EuiCallOut>,
    variants: calloutVariants,
  },
  {
    label: 'Avatar',
    icon: 'user',
    element: <EuiAvatar name="User" />,
    variants: avatarVariants,
  },
  {
    label: 'Text',
    icon: 'document',
    element: (
      <EuiText>
        <p>Sample text content</p>
      </EuiText>
    ),
  },
  {
    label: 'Title',
    icon: 'header',
    element: (
      <EuiTitle>
        <h2>Title</h2>
      </EuiTitle>
    ),
  },
  {
    label: 'Panel',
    icon: 'app',
    element: <EuiPanel paddingSize="m">Panel content</EuiPanel>,
  },
  {
    label: 'Stat',
    icon: 'number',
    element: <EuiStat title="7,600" description="Total items" />,
  },
  {
    label: 'Progress',
    icon: 'clock',
    element: <EuiProgress value={60} max={100} size="m" />,
    variants: progressVariants,
  },
  {
    label: 'Spinner',
    icon: 'refresh',
    element: <EuiLoadingSpinner size="l" />,
  },
  {
    label: 'Switch',
    icon: 'controlsHorizontal',
    element: <EuiSwitch label="Toggle" checked={false} onChange={() => {}} />,
  },
  {
    label: 'Text Field',
    icon: 'pencil',
    element: <EuiFieldText placeholder="Enter text..." />,
  },
  {
    label: 'Search Field',
    icon: 'search',
    element: <EuiFieldSearch placeholder="Search..." />,
  },
  {
    label: 'Health',
    icon: 'dot',
    element: <EuiHealth color="success">Healthy</EuiHealth>,
  },
  {
    label: 'Image',
    icon: 'image',
    element: (
      <EuiImage
        src="/plugins/kibanaReact/assets/illustration_cloud_migration.png"
        alt="Sample image"
        size={200}
      />
    ),
  },
  {
    label: 'Empty Prompt',
    icon: 'faceHappy',
    element: (
      <EuiEmptyPrompt
        iconType="faceHappy"
        title={<h2>No results found</h2>}
        body={<p>Try adjusting your search or filters.</p>}
      />
    ),
  },
];
