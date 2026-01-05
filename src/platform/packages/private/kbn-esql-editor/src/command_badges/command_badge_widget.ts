/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { css } from '@emotion/css';
import type { EuiThemeComputed } from '@elastic/eui';

export interface CommandBadgeWidgetOptions {
  label: string;
  position: monaco.Position;
  onClick: () => void;
  euiTheme: EuiThemeComputed;
  editor: monaco.editor.ICodeEditor;
}

export class CommandBadgeWidget implements monaco.editor.IContentWidget {
  private readonly id: string;
  private domNode: HTMLElement | undefined;
  private position: monaco.Position;

  constructor(private readonly options: CommandBadgeWidgetOptions) {
    this.id = `command-badge-${Date.now()}-${Math.random()}`;
    this.position = options.position;
    options.editor.addContentWidget(this);
  }

  public getId(): string {
    return this.id;
  }

  public getDomNode(): HTMLElement {
    if (!this.domNode) {
      const domNode = document.createElement('span');
      domNode.className = css`
        display: inline-block;
        margin-left: ${this.options.euiTheme.size.xs};
        vertical-align: middle;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        padding: 2px 8px;
        background-color: ${this.options.euiTheme.colors.lightShade};
        border: 1px solid ${this.options.euiTheme.colors.borderBasePlain};
        border-radius: 4px;
        font-size: ${this.options.euiTheme.size.xs};
        color: ${this.options.euiTheme.colors.text};
        transition: background-color 0.2s, color 0.2s;
      `;
      domNode.textContent = this.options.label;
      this.options.editor.applyFontInfo(domNode);

      // Add click handler
      domNode.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.options.onClick();
      });

      // Add hover effects
      domNode.addEventListener('mouseenter', () => {
        domNode.style.backgroundColor = this.options.euiTheme.colors.primary;
        domNode.style.color = this.options.euiTheme.colors.ghost;
      });

      domNode.addEventListener('mouseleave', () => {
        domNode.style.backgroundColor = this.options.euiTheme.colors.lightShade;
        domNode.style.color = this.options.euiTheme.colors.text;
      });

      this.domNode = domNode;
    }
    return this.domNode;
  }

  public getPosition(): monaco.editor.IContentWidgetPosition | null {
    // Position the widget inline after the command
    // Use EXACT positioning to place it right after the command keyword
    return {
      position: this.position,
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  public updatePosition(newPosition: monaco.Position): void {
    this.position = newPosition;
    this.options.editor.layoutContentWidget(this);
  }

  public dispose(): void {
    if (this.domNode) {
      // Remove event listeners by cloning the node
      const newDomNode = this.domNode.cloneNode(false) as HTMLElement;
      this.domNode.parentNode?.replaceChild(newDomNode, this.domNode);
      this.domNode = undefined;
    }
    this.options.editor.removeContentWidget(this);
  }
}
