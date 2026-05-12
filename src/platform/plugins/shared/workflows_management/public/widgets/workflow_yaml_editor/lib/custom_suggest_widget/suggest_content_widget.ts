/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

const WIDGET_ID = 'custom.suggest.widget';
const WIDGET_WIDTH_PX = 700;
/** Class applied to the overflow container that hosts the widget, used to scope CSS overrides. */
export const SUGGEST_HOST_CLASS = 'workflow-custom-suggest-host';

/**
 * IContentWidget wrapper for the custom suggest widget.
 *
 * Positions relative to text content (line/column), scrolls with text,
 * and auto-flips ABOVE/BELOW based on available space.
 *
 * Uses an inner wrapper div because Monaco sets `display: block; position: fixed;`
 * as inline styles on the outer widget DOM node, which would override our layout.
 * The React root is mounted on the inner node.
 *
 * Modeled on PlaceholderWidget (code_editor/impl/utils/placeholder_widget.ts).
 */
export class SuggestContentWidget implements monaco.editor.IContentWidget {
  public readonly allowEditorOverflow = true;
  public readonly suppressMouseDown = true;

  private readonly domNode: HTMLDivElement;
  private readonly innerNode: HTMLDivElement;
  private anchorPosition: { lineNumber: number; column: number } | null = null;

  constructor(private readonly editor: monaco.editor.IStandaloneCodeEditor) {
    this.domNode = document.createElement('div');
    this.domNode.style.width = `${WIDGET_WIDTH_PX}px`;
    this.domNode.style.zIndex = '50';

    this.innerNode = document.createElement('div');
    this.domNode.appendChild(this.innerNode);

    // Prevent clicks on the widget from stealing editor focus
    this.domNode.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    editor.addContentWidget(this);

    // Tag the overflow container that now hosts our widget so we can scope the
    // built-in suggest-widget CSS override to this editor's overflow root only.
    this.domNode.parentElement?.classList.add(SUGGEST_HOST_CLASS);
  }

  getId(): string {
    return WIDGET_ID;
  }

  getDomNode(): HTMLDivElement {
    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.anchorPosition) {
      return null;
    }
    return {
      position: this.anchorPosition,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.BELOW,
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
      ],
    };
  }

  /** Update the anchor position and trigger Monaco re-layout. */
  setAnchorPosition(pos: { lineNumber: number; column: number } | null): void {
    this.anchorPosition = pos;
    this.editor.layoutContentWidget(this);
  }

  /** Get the inner DOM node where the React root should be mounted. */
  getInnerNode(): HTMLDivElement {
    return this.innerNode;
  }

  dispose(): void {
    const host = this.domNode.parentElement;
    this.editor.removeContentWidget(this);
    // Only drop the host class if no other workflow suggest widget is attached.
    if (host && !host.querySelector(`[widgetid="${WIDGET_ID}"]`)) {
      host.classList.remove(SUGGEST_HOST_CLASS);
    }
  }
}
