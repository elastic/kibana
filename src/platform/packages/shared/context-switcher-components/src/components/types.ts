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
  readonly id: string;
  readonly name: string;
  /** Avatar or icon to display. */
  readonly avatar?: ReactElement;
  /** Optional solution badge or metadata shown alongside. */
  readonly badge?: ReactNode;
  /** Solution name (e.g. "Security", "Observability"). Used to derive labels and icons. */
  readonly solution?: string;
  /** Solution icon type (e.g. "logoSecurity"). Used for trigger button and environment row avatar. */
  readonly solutionIcon?: IconType;
}

export interface ContextSwitcherSpacesConfig {
  /** The currently active space. */
  readonly active: SpaceItem;
  /** All available spaces (including the active one). */
  readonly items: ReadonlyArray<SpaceItem>;
  /** Called when user selects a space. */
  readonly onSelect: (spaceId: string) => void;
  /** Optional search config. */
  readonly search?: { readonly placeholder?: string; readonly threshold?: number };
  /** Header action (e.g. "Manage" button). */
  readonly headerAction?: ReactNode;
  /** Footer action (e.g. "Create space"). */
  readonly footerAction?: FooterAction;
  readonly isLoading?: boolean;
}

export interface ContextSwitcherEnvironmentConfig {
  /** Determines static labels (e.g. "My projects" vs "My deployments"). */
  readonly environmentType: 'project' | 'deployment';
  readonly name: string;
  /** Submenu link items (e.g. "Manage project", "View all deployments"). */
  readonly submenuItems: ReadonlyArray<LinksListItem>;
  /** Submenu footer action (e.g. "Create project"). */
  readonly submenuFooterAction?: FooterAction;
}

export interface ContextSwitcherProps {
  /** Active space info + full list of spaces. */
  readonly spaces: ContextSwitcherSpacesConfig;
  /**
   * If provided, enables the root menu with an environment row
   * (project or deployment) + submenu navigation.
   * When absent, the popover shows only the spaces list.
   */
  readonly environmentContext?: ContextSwitcherEnvironmentConfig;
  /** Optional footer links (e.g. "Connection details", "Manage deployments"). */
  readonly footerLinks?: ReadonlyArray<LinksListItem>;
}

export interface LinksListItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly external?: boolean;
  readonly disabled?: boolean;
  readonly iconType?: IconType;
  readonly ['data-test-subj']?: string;
}

export interface FooterAction {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly external?: boolean;
  readonly disabled?: boolean;
  readonly ['data-test-subj']?: string;
}

export interface ContextRowModel {
  readonly id: string;
  readonly label: ReactNode;
  readonly value?: ReactNode;
  readonly prepend?: ReactElement;
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
  readonly ['data-test-subj']?: string;
}
