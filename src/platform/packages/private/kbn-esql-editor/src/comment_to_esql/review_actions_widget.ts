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
const ZONE_HEIGHT_PX = 30;

interface ReviewActionsCallbacks {
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Renders Keep / Undo buttons using a hybrid approach:
 * - A ViewZone inserts vertical space so no editor content is hidden
 * - A ContentWidget renders the interactive buttons on top of that space
 */
export class ReviewActionsWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement | undefined;
  private zoneId: string | undefined;
  private readonly afterLineNumber: number;

  constructor(
    private readonly euiTheme: EuiThemeComputed,
    private readonly editor: monaco.editor.ICodeEditor,
    afterLineNumber: number,
    private readonly callbacks: ReviewActionsCallbacks,
    private readonly isReplaceMode: boolean = false
  ) {
    this.afterLineNumber = afterLineNumber;

    const zoneDom = document.createElement('div');
    editor.changeViewZones((accessor) => {
      this.zoneId = accessor.addZone({
        afterLineNumber,
        heightInPx: ZONE_HEIGHT_PX,
        domNode: zoneDom,
      });
    });

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
        lineNumber: this.afterLineNumber,
        column: 1,
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
    };
  }

  public dispose(): void {
    this.editor.removeContentWidget(this);

    if (this.zoneId) {
      const id = this.zoneId;
      this.editor.changeViewZones((accessor) => {
        accessor.removeZone(id);
      });
      this.zoneId = undefined;
    }

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
      align-items: center;
      height: ${ZONE_HEIGHT_PX}px;
      white-space: nowrap;
      width: max-content;

      & > button + button {
        margin-left: ${this.euiTheme.size.s};
      }
    `;

    const acceptLabel = this.isReplaceMode
      ? i18n.translate('esqlEditor.commentReview.replace', {
          defaultMessage: 'Replace ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧↵' : 'Ctrl+Shift+Enter' },
        })
      : i18n.translate('esqlEditor.commentReview.accept', {
          defaultMessage: 'Keep ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧↵' : 'Ctrl+Shift+Enter' },
        });

    container.appendChild(
      this.createButton(
        i18n.translate('esqlEditor.commentReview.reject', {
          defaultMessage: 'Undo ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧⌫' : 'Ctrl+Shift+Backspace' },
        }),
        'neutral',
        this.callbacks.onReject
      )
    );

    container.appendChild(this.createButton(acceptLabel, 'success', this.callbacks.onAccept));

    return container;
  }

  private createButton(
    label: string,
    variant: 'success' | 'neutral',
    onClick: () => void
  ): HTMLButtonElement {
    const colors: Record<
      typeof variant,
      { bg: string; text: string; hoverBg: string; hoverText: string }
    > = {
      success: {
        bg: this.euiTheme.colors.backgroundFilledSuccess,
        text: this.euiTheme.colors.textInverse,
        hoverBg: this.euiTheme.colors.textSuccess,
        hoverText: this.euiTheme.colors.textInverse,
      },
      neutral: {
        bg: this.euiTheme.colors.backgroundFilledText,
        text: this.euiTheme.colors.textInverse,
        hoverBg: this.euiTheme.colors.backgroundFilledText,
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
      padding: ${this.euiTheme.size.xxs} ${this.euiTheme.size.s};
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
