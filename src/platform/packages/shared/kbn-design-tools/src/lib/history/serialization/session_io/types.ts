/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementPath } from '../element_path';
import type { PageColorScheme } from '../../../dom/get_page_color_mode';

/**
 * Portable version of a single style edit. Element replaced by path.
 */
export interface SerializedStyleEditEntry {
  readonly targetPath: ElementPath;
  readonly relativeSelector?: string;
  readonly property: string;
  readonly original: string;
  readonly originalPriority: string;
  readonly current: string;
  readonly currentPriority: string;
}

/**
 * Portable version of a single text edit. Text node replaced by
 * parent path + child index.
 */
export interface SerializedTextEditEntry {
  readonly parentPath: ElementPath;
  readonly parentRelativeSelector?: string;
  readonly childIndex: number;
  readonly original: string;
  readonly current: string;
}

/**
 * Portable version of a single media/attribute edit.
 */
export interface SerializedMediaEditEntry {
  readonly targetPath: ElementPath;
  readonly relativeSelector?: string;
  readonly attribute: string;
  readonly original: string;
  readonly current: string;
}

/**
 * Portable version of an {@link ElementSession}. All DOM references
 * are replaced by {@link ElementPath} locators.
 */
export interface ExportedSession {
  readonly elPath?: ElementPath;
  readonly dx: number;
  readonly dy: number;
  readonly dw: number;
  readonly dh: number;
  readonly originalRect: { x: number; y: number; width: number; height: number };
  readonly isDuplicate: boolean;
  readonly referenceElPath?: ElementPath;
  readonly styleEdits: SerializedStyleEditEntry[];
  readonly textEdits: SerializedTextEditEntry[];
  readonly mediaEdits: SerializedMediaEditEntry[];
  readonly outerHTML?: string;
  readonly inlineStyles?: string;
  readonly libraryId?: string;
  readonly stateAttributes?: Record<string, string>;
}

/**
 * A soft-deleted page element, hidden via visibility:hidden and
 * DEVTOOL_HIDDEN_ATTR but not removed from the DOM.
 */
export interface ExportedDeletion {
  readonly elPath: ElementPath;
  /** Original CSS transform value, stored so resetAll can restore it. */
  readonly originalTransform: string;
}

/**
 * Top-level export payload written to JSON.
 */
export interface ExportedState {
  readonly version: 1;
  readonly exportedAt: string;
  readonly pageUrl: string;
  readonly viewport: { width: number; height: number };
  /**
   * Scroll position of the main Kibana scroll container at export time.
   * Used to adjust element positions on import so they map back to the
   * same document coordinates regardless of current scroll.
   */
  readonly scroll?: { x: number; y: number };
  /**
   * Color scheme active when the export was created. Used to detect
   * light/dark mode and forced-colors (high contrast) mismatches on import.
   */
  readonly colorScheme?: PageColorScheme;
  readonly sessions: ExportedSession[];
  readonly deletions?: ExportedDeletion[];
}

/**
 * Result of importing a serialized state file.
 */
export interface ImportResult {
  /** Number of sessions successfully restored. */
  restoredCount: number;
  /** Number of soft-deleted elements re-hidden. */
  deletedCount: number;
  /** Warnings from element resolution (fingerprint mismatches, etc.). */
  warnings: string[];
  /** Number of sessions that could not be resolved. */
  failedCount: number;
  /** True when the export's color scheme differs from the current page. */
  colorSchemeMismatch: boolean;
  /** Elements imported as sessions (for undo transaction snapshots). */
  importedElements: HTMLElement[];
  /** Elements soft-hidden by the import's deletion list (for undo). */
  importedDeletions: Array<{ element: HTMLElement; originalTransform: string }>;
}
