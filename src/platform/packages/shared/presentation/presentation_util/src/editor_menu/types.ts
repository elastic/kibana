/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import type { BehaviorSubject } from 'rxjs';

/** Read-only view of a subject. Matches `PublishingSubject` without depending on that package. */
export type EditorMenuSubject<T> = Omit<BehaviorSubject<T>, 'next'>;

export type EditorMenuItem = 'options' | 'help';

export interface ActiveEditorMenu {
  isOpen: boolean;
  menu: EditorMenuItem;
  button: HTMLElement;
}

export interface EditorMenuDescriptor {
  readonly type: string;
  readonly toggleOptions?: (anchor: HTMLElement) => void;
  readonly toggleHelp?: (anchor: HTMLElement) => void;
}

export interface EditorMenuActionContext {
  readonly editor: EditorMenuDescriptor;
  readonly anchor?: HTMLElement;
  /** Panel API forwarded to editor-menu actions. */
  readonly api?: unknown;
}

/** Services the caller owns. The package does not read plugin start contracts itself. */
export interface EditorMenuServices {
  getAction: (id: string) => Promise<{
    execute: (context: EditorMenuActionContext & { trigger?: unknown }) => Promise<void> | void;
  }>;
  notifications: {
    toasts: {
      addError: (error: Error, options: { title: string }) => void;
    };
  };
  /** Trigger metadata forwarded with the editor-menu action context. */
  trigger?: unknown;
}

/**
 * Props the flyout body passes to the caller's search bar. Matches the isolated
 * panel search bar: no date picker, no saved queries, and no global data service.
 */
export interface EditorFlyoutSearchBarProps {
  appName: string;
  query: Query;
  filters?: Filter[];
  indexPatterns?: object[];
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showDatePicker?: boolean;
  showSubmitButton?: boolean;
  showSavedQueryControls?: boolean;
  isAutoRefreshDisabled?: boolean;
  useDefaultBehaviors?: boolean;
  disableSubscribingToGlobalDataServices?: boolean;
  onQueryChange?: (payload: { query?: Query }) => void;
  onQuerySubmit?: (payload: { query?: Query }) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  displayStyle?: 'inPage';
  dataTestSubj?: string;
}

export interface EditorMenuManager {
  readonly historyKey: symbol;
  readonly flyoutId: string;
  readonly flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'];
  readonly activeMenu$: EditorMenuSubject<ActiveEditorMenu | null>;
  /**
   * Panel API for editor chrome. The add-panel flow sets this after the panel is created.
   */
  readonly panelApi$: EditorMenuSubject<unknown>;
  close: (menu: ActiveEditorMenu) => void;
  returnToEditor: () => void;
  /**
   * Points editor chrome at a panel API that did not exist when the menu was built.
   * The add-panel flow opens the editor flyout before the panel is created.
   */
  setPanelApi: (api: unknown) => void;
  /** Keeps live query and filter edits when the flyout closes. */
  commitSession: () => void;
  isSessionCommitted: () => boolean;
  dispose: () => void;
}

export interface InitializeEditorMenuManagerParams {
  readonly services: EditorMenuServices;
  readonly editorType: string;
  readonly title: string;
  readonly supportedMenus: ReadonlyArray<EditorMenuItem>;
  /** Overrides the default button label for a menu the editor already lists. */
  readonly menuLabels?: Partial<Record<EditorMenuItem, string>>;
  /** Registered action id for a menu the editor already lists. */
  readonly menuActionIds?: Partial<Record<EditorMenuItem, string>>;
  /** Panel API forwarded to editor-menu actions and editor chrome. */
  readonly api?: unknown;
}
