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

export type EditorMenuItem = 'options' | 'help' | 'filters';
type EditorPopoverMenu = Exclude<EditorMenuItem, 'filters'>;

export interface ActiveEditorMenu {
  isOpen: boolean;
  menu: EditorPopoverMenu;
  button: HTMLElement;
}

export interface EditorMenuDescriptor {
  readonly type: string;
  readonly toggleOptions?: (anchor: HTMLElement) => void;
  readonly toggleHelp?: (anchor: HTMLElement) => void;
  readonly openFilters?: (anchor: HTMLElement) => void;
}

export interface EditorMenuActionContext {
  readonly editor: EditorMenuDescriptor;
  readonly anchor?: HTMLElement;
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
}
