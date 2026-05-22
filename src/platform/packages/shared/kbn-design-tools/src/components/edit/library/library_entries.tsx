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
import {
  AccordionRegular,
  AccordionOpen,
  AccordionArrowRight,
  AccordionBorders,
  AccordionMultiple,
} from './accordion';
import {
  CardRegular,
  CardClickable,
  CardHorizontal,
  CardPlain,
  CardBordered,
  CardGroup,
} from './card';
import {
  SplitButtonRegular,
  SplitButtonFill,
  SplitButtonSmall,
  SplitButtonDisabled,
  SplitButtonWithIcon,
} from './split_button';
import {
  ButtonGroupSingle,
  ButtonGroupIconOnly,
  ButtonGroupMulti,
  ButtonGroupCompressed,
} from './button_group';
import { LinkRegular, LinkExternal, LinkButton, LinkDisabled } from './link';
import { StepsRegular, StepsWithStatus, StepsHorizontal, StepsSmall } from './steps';
import { TreeViewRegular, TreeViewCompressed, TreeViewExpanded } from './tree_view';
import {
  AvatarRegular,
  AvatarLarge,
  AvatarSmall,
  AvatarSpace,
  AvatarIcon,
  AvatarDisabled,
} from './avatar';
import {
  BadgeRegular,
  BadgeHollow,
  BadgeClickable,
  BadgeWithIcon,
  BadgeDisabled,
  BadgeGroup,
  BadgeBeta,
  BadgeNotification,
} from './badge';
import { BeaconRegular, BeaconLarge } from './beacon';
import {
  CalloutInfo,
  CalloutSuccess,
  CalloutWarning,
  CalloutDanger,
  CalloutSmall,
  CalloutTitleOnly,
} from './callout';
import {
  IconRegular,
  IconLarge,
  IconXXL,
  IconApp,
  IconLogo,
  TokenRegular,
  TokenLarge,
} from './icon';
import {
  SelectRegular,
  SelectCompressed,
  SelectDisabled,
  SelectLoading,
  SuperSelectRegular,
  SuperSelectCompressed,
  SuperSelectDisabled,
} from './select';

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
 * Library entry for an EUI component that can be inserted via design tools.
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
  { label: 'Regular', element: <SwitchRegular /> },
  { label: 'Disabled', element: <SwitchDisabled /> },
  { label: 'Compressed', element: <SwitchCompressed /> },
  { label: 'Mini', element: <SwitchMini /> },
  { label: 'No Label', element: <SwitchNoLabel /> },
];

const accordionVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <AccordionRegular /> },
  { label: 'Opened', element: <AccordionOpen /> },
  { label: 'Arrow Right', element: <AccordionArrowRight /> },
  { label: 'With Borders', element: <AccordionBorders /> },
  { label: 'Multiple', element: <AccordionMultiple /> },
];

const cardVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <CardRegular /> },
  { label: 'Clickable', element: <CardClickable /> },
  { label: 'Horizontal', element: <CardHorizontal /> },
  { label: 'Plain', element: <CardPlain /> },
  { label: 'Bordered', element: <CardBordered /> },
  { label: 'Group', element: <CardGroup /> },
];

const splitButtonVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <SplitButtonRegular /> },
  { label: 'Fill', element: <SplitButtonFill /> },
  { label: 'Small', element: <SplitButtonSmall /> },
  { label: 'Disabled', element: <SplitButtonDisabled /> },
  { label: 'With Icon', element: <SplitButtonWithIcon /> },
];

const buttonGroupVariants: EuiComponentVariant[] = [
  { label: 'Single Select', element: <ButtonGroupSingle /> },
  { label: 'Icon Only', element: <ButtonGroupIconOnly /> },
  { label: 'Multi Select', element: <ButtonGroupMulti /> },
  { label: 'Compressed', element: <ButtonGroupCompressed /> },
];

const linkVariants: EuiComponentVariant[] = [
  { label: 'Inline', element: <LinkRegular /> },
  { label: 'External', element: <LinkExternal /> },
  { label: 'Button', element: <LinkButton /> },
  { label: 'Disabled', element: <LinkDisabled /> },
];

const stepsVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <StepsRegular /> },
  { label: 'With Status', element: <StepsWithStatus /> },
  { label: 'Horizontal', element: <StepsHorizontal /> },
  { label: 'Small', element: <StepsSmall /> },
];

const treeViewVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <TreeViewRegular /> },
  { label: 'Compressed', element: <TreeViewCompressed /> },
  { label: 'Expanded', element: <TreeViewExpanded /> },
];

const avatarVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <AvatarRegular /> },
  { label: 'Large', element: <AvatarLarge /> },
  { label: 'Small', element: <AvatarSmall /> },
  { label: 'Space', element: <AvatarSpace /> },
  { label: 'Icon', element: <AvatarIcon /> },
  { label: 'Disabled', element: <AvatarDisabled /> },
];

const badgeVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <BadgeRegular /> },
  { label: 'Hollow', element: <BadgeHollow /> },
  { label: 'Clickable', element: <BadgeClickable /> },
  { label: 'With Icon', element: <BadgeWithIcon /> },
  { label: 'Disabled', element: <BadgeDisabled /> },
  { label: 'Group', element: <BadgeGroup /> },
  { label: 'Beta', element: <BadgeBeta /> },
  { label: 'Notification', element: <BadgeNotification /> },
];

const beaconVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <BeaconRegular /> },
  { label: 'Large', element: <BeaconLarge /> },
];

const calloutVariants: EuiComponentVariant[] = [
  { label: 'Info', element: <CalloutInfo /> },
  { label: 'Success', element: <CalloutSuccess /> },
  { label: 'Warning', element: <CalloutWarning /> },
  { label: 'Danger', element: <CalloutDanger /> },
  { label: 'Small', element: <CalloutSmall /> },
  { label: 'Title Only', element: <CalloutTitleOnly /> },
];

const iconVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <IconRegular /> },
  { label: 'Large', element: <IconLarge /> },
  { label: 'XX-Large', element: <IconXXL /> },
  { label: 'App Icon', element: <IconApp /> },
  { label: 'Logo', element: <IconLogo /> },
  { label: 'Token', element: <TokenRegular /> },
  { label: 'Token Large', element: <TokenLarge /> },
];

const selectVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <SelectRegular /> },
  { label: 'Compressed', element: <SelectCompressed /> },
  { label: 'Disabled', element: <SelectDisabled /> },
  { label: 'Loading', element: <SelectLoading /> },
];

const superSelectVariants: EuiComponentVariant[] = [
  { label: 'Regular', element: <SuperSelectRegular /> },
  { label: 'Compressed', element: <SuperSelectCompressed /> },
  { label: 'Disabled', element: <SuperSelectDisabled /> },
];

/**
 * Curated library of EUI components available for insertion via design tools.
 * Each entry uses JSX to define the rendered element directly.
 */
export const EUI_LIBRARY: EuiLibraryEntry[] = [
  {
    label: 'Accordion',
    element: <AccordionRegular />,
    variants: accordionVariants,
  },
  {
    label: 'Avatar',
    element: <AvatarRegular />,
    variants: avatarVariants,
  },
  {
    label: 'Badge',
    element: <BadgeRegular />,
    variants: badgeVariants,
  },
  {
    label: 'Beacon',
    element: <BeaconRegular />,
    variants: beaconVariants,
  },
  {
    label: 'Button',
    element: <ButtonRegular />,
    variants: buttonVariants,
  },
  {
    label: 'Button Group',
    element: <ButtonGroupSingle />,
    variants: buttonGroupVariants,
  },
  {
    label: 'Callout',
    element: <CalloutInfo />,
    variants: calloutVariants,
  },
  {
    label: 'Card',
    element: <CardRegular />,
    variants: cardVariants,
  },
  {
    label: 'Icon',
    element: <IconRegular />,
    variants: iconVariants,
  },
  {
    label: 'Link',
    element: <LinkRegular />,
    variants: linkVariants,
  },
  {
    label: 'Select',
    element: <SelectRegular />,
    variants: selectVariants,
  },
  {
    label: 'Split Button',
    element: <SplitButtonRegular />,
    variants: splitButtonVariants,
  },
  {
    label: 'Steps',
    element: <StepsRegular />,
    variants: stepsVariants,
  },
  {
    label: 'Super Select',
    element: <SuperSelectRegular />,
    variants: superSelectVariants,
  },
  {
    label: 'Switch',
    element: <SwitchRegular />,
    variants: switchVariants,
  },
  {
    label: 'Tree View',
    element: <TreeViewRegular />,
    variants: treeViewVariants,
  },
];
