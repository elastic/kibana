/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { EuiThemeComputed } from '@elastic/eui';
export declare class PlaceholderWidget implements monaco.editor.IContentWidget {
  private readonly placeholderText;
  private readonly euiTheme;
  private readonly editor;
  constructor(
    placeholderText: string,
    euiTheme: EuiThemeComputed,
    editor: monaco.editor.ICodeEditor
  );
  private domNode;
  getId(): string;
  getDomNode(): HTMLElement;
  getPosition(): monaco.editor.IContentWidgetPosition | null;
  dispose(): void;
}
