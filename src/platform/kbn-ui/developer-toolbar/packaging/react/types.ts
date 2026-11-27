/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for the `@kbn/ui-developer-toolbar` external package.
 *
 * Types are defined inline (not re-exported) so that declaration generation
 * does not pull in the full Kibana dependency graph. Build-time validation in
 * `type_validation.ts` ensures these stay in sync with the source types.
 *
 * @see {@link ./type_validation.ts} for the compatibility check.
 */

import type * as React from 'react';

/** Environment details shown by the environment badge. */
export interface EnvironmentInfo {
  mode: {
    name: 'development' | 'production';
  };
  packageInfo?: {
    version?: string;
    branch?: string;
    buildNum?: number;
    buildSha?: string;
    buildShaShort?: string;
    buildDate?: Date | string | number;
    buildFlavor?: string;
    dist?: boolean;
  };
  labels?: Record<string, string>;
}

/** Props for the `DeveloperToolbar` component. */
export interface DeveloperToolbarProps {
  envInfo?: EnvironmentInfo;
  onHeightChange?: (height: number) => void;
  disableHint?: string;
  iconType?: string;
  portal?: boolean;
}

/** Props for the `DeveloperToolbarItem` component. */
export interface DeveloperToolbarItemProps {
  id: string;
  children: React.ReactNode;
  priority?: number;
}

/** A registered toolbar item. */
export interface DeveloperToolbarRegisteredItem {
  id: string;
  children: React.ReactNode;
  priority?: number;
}

/** Shared toolbar state returned by `useToolbarState`. */
export interface DeveloperToolbarState {
  items: DeveloperToolbarRegisteredItem[];
  enabledItems: DeveloperToolbarRegisteredItem[];
  registerItem: (item: DeveloperToolbarRegisteredItem) => () => void;
  toggleItemEnabled: (itemId: string) => void;
  isEnabled: (itemId: string) => boolean;
}

/** Props for the `MeasureButton` component. */
export interface MeasureButtonProps {
  /** Class name prefixes of host chrome elements the measure overlay never selects. */
  ignoredClassPrefixes?: readonly string[];
}

/** Repository-relative data for the file that defines an inspected component. */
export interface InspectFileData {
  relativePath: string;
  baseFileName: string;
  codeowners?: string[];
}

/** Source location of an inspected component, as recorded by React's `_debugSource`. */
export interface InspectSourceLocation {
  fileName: string;
  relativePath: string;
  lineNumber: number;
  columnNumber: number;
}

/** A link rendered in the inspect flyout actions section. */
export interface InspectSourceLink {
  id: string;
  label: string;
  href: string;
  iconType: string;
}

/** Host integration for the inspect tool. */
export interface InspectHostConfig {
  /** Resolve a `_debugSource.fileName` to repo-relative data; `null` when unknown. */
  resolveFileData: (fileName: string) => Promise<InspectFileData | null>;
  /** Links rendered in the flyout actions section (GitHub, editors, ...). */
  getSourceLinks: (location: InspectSourceLocation) => InspectSourceLink[];
  /** Optional link for a codeowner (e.g. GitHub team page). Plain text when absent. */
  getCodeownerHref?: (codeowner: string) => string | undefined;
  /** Color mode for the flyout; defaults to the host's current EUI color mode. */
  colorMode?: 'light' | 'dark';
}

/** `'inspect'` opens a flyout with component details, `'grab'` copies or drags out an agent-friendly context. */
export type InspectMode = 'inspect' | 'grab';

/** Props for the `InspectButton` component. */
export interface InspectButtonProps {
  host: InspectHostConfig;
  /** Mode toggled by this button; render one button per mode. Defaults to `'inspect'`. */
  mode?: InspectMode;
  /** Class name prefixes of host chrome elements the inspect overlay never selects. */
  ignoredClassPrefixes?: readonly string[];
}

/** Options for `createGithubSourceLinks`. */
export interface CreateGithubSourceLinksOptions {
  /** GitHub repository slug, e.g. `elastic/kibana`. */
  repo: string;
  branch: string;
}

/** Options for `createPrefixFileResolver`. */
export interface CreatePrefixFileResolverOptions {
  /** Absolute path of the repository root, e.g. `/Users/me/repos/cloud-ui/`. */
  repoRoot: string;
}

/** Developer toolbar shell with the built-in monitors; render once per page. */
export declare function DeveloperToolbar(props: DeveloperToolbarProps): React.ReactNode;

/** Registers an item to be displayed in the developer toolbar. */
export declare function DeveloperToolbarItem(props: DeveloperToolbarItemProps): React.ReactNode;

/** Toolbar button that toggles the spacing measure overlay (`⌘ .` / `Ctrl .`). */
export declare function MeasureButton(props: MeasureButtonProps): React.ReactNode;

/** Toolbar button that toggles the component inspect (`⌘ '` / `Ctrl '`) or grab (`⌘ ⇧ '` / `Ctrl Shift '`) overlay. */
export declare function InspectButton(props: InspectButtonProps): React.ReactNode;

/** Builds GitHub, github.dev, VS Code, WebStorm and Cursor links for `InspectHostConfig.getSourceLinks`. */
export declare function createGithubSourceLinks(
  options: CreateGithubSourceLinksOptions
): (location: InspectSourceLocation) => InspectSourceLink[];

/** Builds an `InspectHostConfig.resolveFileData` that strips `repoRoot` from file names client-side. */
export declare function createPrefixFileResolver(
  options: CreatePrefixFileResolverOptions
): (fileName: string) => Promise<InspectFileData | null>;

/** Accesses the shared toolbar state (registered items and enabled settings). */
export declare function useToolbarState(): DeveloperToolbarState;
