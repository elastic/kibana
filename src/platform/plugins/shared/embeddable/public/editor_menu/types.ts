/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { ComponentType } from 'react';

export type EditorMenuItem = 'options' | 'help' | 'filters';
type EditorPopoverMenu = Exclude<EditorMenuItem, 'filters'>;

export interface ActiveEditorMenu {
  isOpen: boolean;
  menu: EditorPopoverMenu;
  button: HTMLElement;
}

export interface EditorFiltersBodyProps {
  closeFlyout: () => void;
  menuManager: EditorMenuManager;
}

export interface EditorMenuDescriptor {
  readonly type: string;
  readonly toggleOptions?: (anchor: HTMLElement) => void;
  readonly toggleHelp?: (anchor: HTMLElement) => void;
  /** Mounts the filters body into a flyout the menu manager has already opened. */
  readonly mountFiltersBody?: (Body: ComponentType<EditorFiltersBodyProps>) => void;
}

export interface EditorMenuActionContext {
  readonly editor: EditorMenuDescriptor;
  readonly anchor?: HTMLElement;
  /** Panel API the filters action checks with `apiPublishesWritableUnifiedSearch`. */
  readonly api?: unknown;
}

export interface EditorMenuManager {
  readonly historyKey: symbol;
  readonly flyoutId: string;
  readonly flyoutMenuProps: EuiFlyoutProps['flyoutMenuProps'];
  readonly activeMenu$: PublishingSubject<ActiveEditorMenu | null>;
  close: (menu: ActiveEditorMenu) => void;
  returnToEditor: () => void;
  dispose: () => void;
}

export interface InitializeEditorMenuManagerParams {
  readonly editorType: string;
  readonly title: string;
  readonly supportedMenus: ReadonlyArray<EditorMenuItem>;
  readonly flyoutType?: 'push' | 'overlay';
  /** Overrides the default button label for a menu the editor already lists. */
  readonly menuLabels?: Partial<Record<EditorMenuItem, string>>;
  /**
   * Registered action id for a menu the editor already lists. Filters defaults to the shared
   * edit-filters action when omitted.
   */
  readonly menuActionIds?: Partial<Record<EditorMenuItem, string>>;
  /** Panel API forwarded to editor-menu actions. */
  readonly api?: unknown;
}
