/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import type { IconType } from '@elastic/eui';

export const POPOVER_WIDTH_PX = 360;
export const SELECTABLE_ROW_HEIGHT_PX = 40;

export interface SpaceItem {
  id: string;
  name: string;
  /** Render function for the space avatar. Accepts EUI avatar size. */
  avatar?: (size: 's' | 'l') => ReactElement;
  /** Optional solution badge or metadata shown alongside. */
  badge?: ReactNode;
  /** Solution name (e.g. "Security", "Observability"). Used to derive labels and icons. */
  solution?: string;
  /** Solution icon type (e.g. "logoSecurity"). Used for trigger button and environment row avatar. */
  solutionIcon?: IconType;
}

export interface ContextSwitcherSpacesConfig {
  /** The currently active space. */
  active: SpaceItem;
  /** All available spaces (including the active one). */
  items: SpaceItem[];
  /** Called when user selects a space. */
  onSelect: (spaceId: string, event: MouseEvent | KeyboardEvent) => void;
  /** Optional search config. */
  search?: { placeholder?: string; threshold?: number };
  /** Header action (e.g. "Manage" button). */
  headerAction?: ActionConfig;
  /** Footer action (e.g. "Create space"). */
  footerAction?: ActionConfig;
  isLoading?: boolean;
}

export interface ContextSwitcherEnvironmentConfig {
  /** Determines static labels (e.g. "My projects" vs "My deployments"). */
  environmentType: 'project' | 'deployment';
  name: string;
  /** Submenu link items (e.g. "Manage project", "View all deployments"). */
  submenuItems: LinksListItem[];
  /** Submenu footer action (e.g. "Create project"). */
  submenuFooterAction?: ActionConfig;
}

/** Design variants for the header context switcher. */
export type ContextSwitcherVariant = 'original' | 'proposal1' | 'proposal2';

/** Project identity shown in the proposal 2 popover header. */
export interface ContextSwitcherProjectSummary {
  /** Solution logo, for example "logoSecurity". */
  icon?: IconType;
  /** Project name. */
  name: string;
  /** Smaller line under the name, for example "Serverless project". */
  description: string;
  /** Opens this project in Cloud. */
  href?: string;
}

export interface ContextSwitcherProps {
  /** Active space info + full list of spaces. */
  spaces: ContextSwitcherSpacesConfig;
  /**
   * Which header design to render.
   * `original` is the combined project and space menu.
   * `proposal1` is the project menu on the Elastic logo and a spaces-only switcher.
   * `proposal2` is a space-name trigger that opens a header, space list, and footer.
   */
  variant?: ContextSwitcherVariant;
  /**
   * Used by the original variant. Enables the root menu with an environment row
   * (project or deployment) and submenu navigation.
   * When absent, the popover shows only the spaces list.
   */
  environmentContext?: ContextSwitcherEnvironmentConfig;
  /** Footer links such as "Get started" and "Connection details". */
  footerLinks?: LinksListItem[];
  /** Used by proposal 2. */
  projectSummary?: ContextSwitcherProjectSummary;
  /** Called when the popover opens. */
  onOpen?: () => void;
}

export interface LinksListItem {
  id: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  disabled?: boolean;
  iconType?: IconType;
  ['data-test-subj']?: string;
}

export interface ActionConfig {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  disabled?: boolean;
  iconType?: IconType;
  ['data-test-subj']?: string;
}

export interface ContextRowModel {
  id: string;
  label: ReactNode;
  value?: ReactNode;
  prepend?: ReactElement;
  disabled?: boolean;
  ariaLabel?: string;
  ['data-test-subj']?: string;
}
