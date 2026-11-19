/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Repository-relative data for the file that defines an inspected component. */
export interface InspectFileData {
  /** File path relative to the repository root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
  /** Owners of the file (e.g. `@elastic/team`), when the host can resolve them. */
  codeowners?: string[];
}

/** Source location of an inspected component, as recorded by React's `_debugSource`. */
export interface InspectSourceLocation {
  /** Absolute file path from `_debugSource`. */
  fileName: string;
  /** File path relative to the repository root. */
  relativePath: string;
  /** Line of the JSX element in the source file. */
  lineNumber: number;
  /** Column of the JSX element in the source file. */
  columnNumber: number;
}

/** A link rendered in the inspect flyout actions section. */
export interface InspectSourceLink {
  /** Unique id, also used in the `data-test-subj` of the link card. */
  id: string;
  /** Visible label (e.g. `GitHub`). */
  label: string;
  /** Link target. */
  href: string;
  /** EUI icon type for the link card. */
  iconType: string;
}

/** Host integration for the inspect tool. */
export interface InspectHostConfig {
  /**
   * Resolve a `_debugSource.fileName` to repo-relative data. The host decides how
   * (HTTP, static map, prefix strip). Return `null` when the file is unknown.
   */
  resolveFileData: (fileName: string) => Promise<InspectFileData | null>;
  /** Links rendered in the flyout actions section (GitHub, editors, ...). */
  getSourceLinks: (location: InspectSourceLocation) => InspectSourceLink[];
  /** Optional link for a codeowner (e.g. GitHub team page). Plain text when absent. */
  getCodeownerHref?: (codeowner: string) => string | undefined;
  /**
   * Color mode for the flyout; defaults to the EUI color mode of the page the
   * `DeveloperToolbar` is rendered in (not the toolbar's own dark theme).
   */
  colorMode?: 'light' | 'dark';
}

/**
 * 'inspect' opens a flyout with component details,
 * 'grab' lets the element be dragged into a coding agent and copies its context to the clipboard.
 */
export type InspectMode = 'inspect' | 'grab';

/** Props for the `InspectButton` component. */
export interface InspectButtonProps {
  /** Host integration used to resolve files and build links. */
  host: InspectHostConfig;
  /**
   * Mode toggled by this button (`⌘ '` / `Ctrl '` for inspect, `⌘ ⇧ '` / `Ctrl Shift '` for grab).
   * Render one button per mode; only one mode can be active at a time. Defaults to `'inspect'`.
   */
  mode?: InspectMode;
  /**
   * Class name prefixes of host chrome elements (e.g. `kbnChromeLayout`) that the
   * inspect overlay should never select. Defaults to none.
   */
  ignoredClassPrefixes?: readonly string[];
}
