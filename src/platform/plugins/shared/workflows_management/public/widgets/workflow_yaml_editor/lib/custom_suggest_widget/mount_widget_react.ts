/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { monaco } from '@kbn/monaco';

import { SuggestContentWidget } from './suggest_content_widget';
import { type SuggestWidgetHandle, SuggestWidgetRoot } from './suggest_widget_root';

export interface MountedSuggestWidget {
  widget: SuggestContentWidget;
  getHandle: () => SuggestWidgetHandle | null;
  dispose: () => void;
}

/**
 * Create the IContentWidget, mount a React root with its own EuiProvider, and
 * expose an imperative handle for fast state updates. Kept separate from the
 * hook so the lifecycle and React wiring can be read and tested without the
 * full keyboard/subscription plumbing.
 */
export const mountSuggestWidget = (
  editor: monaco.editor.IStandaloneCodeEditor,
  opts: {
    colorMode: 'light' | 'dark';
    onSelect: (index: number) => void;
    onAccept: (index: number) => void;
  }
): MountedSuggestWidget => {
  const widget = new SuggestContentWidget(editor);
  const root = createRoot(widget.getInnerNode());

  let handle: SuggestWidgetHandle | null = null;
  const refCallback = (next: SuggestWidgetHandle | null) => {
    handle = next;
  };

  root.render(
    React.createElement(
      EuiProvider,
      { colorMode: opts.colorMode },
      React.createElement(SuggestWidgetRoot, {
        ref: refCallback,
        onSelect: opts.onSelect,
        onAccept: opts.onAccept,
      })
    )
  );

  return {
    widget,
    getHandle: () => handle,
    dispose: () => {
      root.unmount();
      widget.dispose();
    },
  };
};
