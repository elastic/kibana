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
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';

const WIDGET_ID = 'ESQL_COMMENT_REVIEW_ACTIONS_WIDGET';

interface ReviewActionsCallbacks {
  onAccept: () => void;
  onReject: () => void;
}

export class ReviewActionsWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement | undefined;
  private lineNumber: number;

  constructor(
    private readonly euiTheme: EuiThemeComputed,
    private readonly editor: monaco.editor.ICodeEditor,
    lineNumber: number,
    private readonly callbacks: ReviewActionsCallbacks
  ) {
    this.lineNumber = lineNumber;
    editor.addContentWidget(this);
  }

  public getId(): string {
    return WIDGET_ID;
  }

  public getDomNode(): HTMLElement {
    if (!this.domNode) {
      this.domNode = this.buildDom();
    }
    return this.domNode;
  }

  public getPosition(): monaco.editor.IContentWidgetPosition | null {
    return {
      position: {
        lineNumber: this.lineNumber,
        column: 1,
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
    };
  }

  public dispose(): void {
    this.editor.removeContentWidget(this);
    this.domNode = undefined;
  }

  private buildDom(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('role', 'toolbar');
    container.setAttribute(
      'aria-label',
      i18n.translate('esqlEditor.commentReview.toolbar', {
        defaultMessage: 'Review generated code',
      })
    );
    container.className = css`
      display: flex;
      flex-direction: row;
      gap: ${this.euiTheme.size.xs};
      padding: ${this.euiTheme.size.xs} 0;
      white-space: nowrap;
      width: max-content;
    `;

    container.appendChild(
      this.createButton(
        i18n.translate('esqlEditor.commentReview.accept', {
          defaultMessage: 'Accept ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧↵' : 'Ctrl+Shift+Enter' },
        }),
        'success',
        this.callbacks.onAccept
      )
    );

    container.appendChild(
      this.createButton(
        i18n.translate('esqlEditor.commentReview.reject', {
          defaultMessage: 'Reject ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧⌫' : 'Ctrl+Shift+Backspace' },
        }),
        'danger',
        this.callbacks.onReject
      )
    );

    return container;
  }

  private createButton(
    label: string,
    variant: 'success' | 'danger',
    onClick: () => void
  ): HTMLButtonElement {
    const colors: Record<
      typeof variant,
      { bg: string; text: string; hoverBg: string; hoverText: string }
    > = {
      success: {
        bg: this.euiTheme.colors.backgroundLightSuccess,
        text: this.euiTheme.colors.textSuccess,
        hoverBg: this.euiTheme.colors.backgroundFilledSuccess,
        hoverText: this.euiTheme.colors.textInverse,
      },
      danger: {
        bg: this.euiTheme.colors.backgroundLightDanger,
        text: this.euiTheme.colors.textDanger,
        hoverBg: this.euiTheme.colors.backgroundFilledDanger,
        hoverText: this.euiTheme.colors.textInverse,
      },
    };

    const { bg, text, hoverBg, hoverText } = colors[variant];

    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = css`
      cursor: pointer;
      border: none;
      border-radius: ${this.euiTheme.border.radius.small};
      padding: 2px ${this.euiTheme.size.s};
      font-size: ${this.euiTheme.size.m};
      font-weight: ${this.euiTheme.font.weight.medium};
      background-color: ${bg};
      color: ${text};
      line-height: 1.4;
      &:hover {
        background-color: ${hoverBg};
        color: ${hoverText};
      }
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
}
