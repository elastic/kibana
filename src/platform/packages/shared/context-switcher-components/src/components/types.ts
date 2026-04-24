/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import type { IconType } from '@elastic/eui';

export const POPOVER_WIDTH = 400;
export const SELECTABLE_ROW_HEIGHT = 40;
export const CONTEXT_ROW_HEIGHT = 48;

export interface SpaceItem {
  id: string;
  name: string;
  /** Avatar or icon to display. */
  avatar?: ReactElement;
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
  onSelect: (spaceId: string) => void;
  /** Optional search config. */
  search?: { placeholder?: string; threshold?: number };
  /** Header action (e.g. "Manage" button). */
  headerAction?: ReactNode;
  /** Footer action (e.g. "Create space"). */
  footerAction?: FooterAction;
  isLoading?: boolean;
}

export interface ContextSwitcherEnvironmentConfig {
  /** Determines static labels (e.g. "My projects" vs "My deployments"). */
  environmentType: 'project' | 'deployment';
  name: string;
  /** Submenu link items (e.g. "Manage project", "View all deployments"). */
  submenuItems: LinksListItem[];
  /** Submenu footer action (e.g. "Create project"). */
  submenuFooterAction?: FooterAction;
}

export interface ContextSwitcherProps {
  /** Active space info + full list of spaces. */
  spaces: ContextSwitcherSpacesConfig;
  /**
   * If provided, enables the root menu with an environment row
   * (project or deployment) + submenu navigation.
   * When absent, the popover shows only the spaces list.
   */
  environmentContext?: ContextSwitcherEnvironmentConfig;
  /** Optional footer links (e.g. "Connection details", "Manage deployments"). */
  footerLinks?: LinksListItem[];
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

export interface FooterAction {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  disabled?: boolean;
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
