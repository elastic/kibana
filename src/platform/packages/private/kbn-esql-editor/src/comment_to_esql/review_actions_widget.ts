/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { css } from '@emotion/css';
import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';

const WIDGET_ID = 'ESQL_COMMENT_REVIEW_ACTIONS_WIDGET';
// Buttons (~30px) plus 8px breathing room above so they don't sit flush against the inserted code.
const ZONE_HEIGHT_PX = 38;
const ZONE_PADDING_TOP_PX = 8;
const MAX_FOCUS_ATTEMPTS = 8;

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
  private buttons: HTMLButtonElement[] = [];
  private focusFrame: number | undefined;
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

  /** Puts keyboard focus on Undo so Replace is the next tab stop. */
  public focus(): void {
    this.getDomNode();
    this.focusWhenRendered(this.buttons[0]);
  }

  public dispose(): void {
    this.cancelScheduledFocus();
    this.editor.removeContentWidget(this);

    if (this.zoneId) {
      const id = this.zoneId;
      this.editor.changeViewZones((accessor) => {
        accessor.removeZone(id);
      });
      this.zoneId = undefined;
    }

    this.domNode = undefined;
    this.buttons = [];
  }

  /**
   * Monaco keeps a content widget hidden until its next render frame and exposes no
   * event for it, so focus() is ignored until then. Retry per frame until it sticks.
   */
  private focusWhenRendered(button: HTMLButtonElement | undefined): void {
    if (!button) return;
    this.cancelScheduledFocus();

    const attempt = (remaining: number) => {
      this.focusFrame = undefined;
      button.focus({ preventScroll: true });
      if (document.activeElement === button || remaining <= 1) return;
      this.focusFrame = requestAnimationFrame(() => attempt(remaining - 1));
    };
    attempt(MAX_FOCUS_ATTEMPTS);
  }

  private cancelScheduledFocus(): void {
    if (this.focusFrame !== undefined) {
      cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
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
      box-sizing: border-box;
      height: ${ZONE_HEIGHT_PX}px;
      padding-top: ${ZONE_PADDING_TOP_PX}px;
      white-space: nowrap;
      width: max-content;

      & > button + button {
        margin-left: ${this.euiTheme.size.s};
      }
    `;
    container.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const index = this.buttons.findIndex((button) => button === event.target);
      if (index === -1) return;
      // The editor's Tab command would otherwise send focus back to Undo.
      event.preventDefault();
      event.stopPropagation();
      this.cancelScheduledFocus();
      const next = this.buttons[index + (event.shiftKey ? -1 : 1)];
      if (next) {
        next.focus({ preventScroll: true });
      } else {
        this.editor.focus();
      }
    });

    const acceptLabel = this.isReplaceMode
      ? i18n.translate('esqlEditor.commentReview.replace', {
          defaultMessage: 'Replace ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧↵' : 'Ctrl+Shift+Enter' },
        })
      : i18n.translate('esqlEditor.commentReview.accept', {
          defaultMessage: 'Keep ({shortcut})',
          values: { shortcut: isMac ? '⌘⇧↵' : 'Ctrl+Shift+Enter' },
        });

    const rejectButton = this.createButton(
      i18n.translate('esqlEditor.commentReview.reject', {
        defaultMessage: 'Undo ({shortcut})',
        values: { shortcut: isMac ? '⌘⇧⌫' : 'Ctrl+Shift+Backspace' },
      }),
      'neutral',
      this.callbacks.onReject
    );
    const acceptButton = this.createButton(acceptLabel, 'success', this.callbacks.onAccept);

    this.buttons = [rejectButton, acceptButton];
    container.append(...this.buttons);

    return container;
  }

  private createButton(
    label: string,
    variant: 'success' | 'neutral',
    onClick: () => void
  ): HTMLButtonElement {
    const colors: Record<
      typeof variant,
      { bg: string; text: string; border: string; hoverBg: string; hoverText: string }
    > = {
      success: {
        bg: this.euiTheme.colors.backgroundLightSuccess,
        text: this.euiTheme.colors.textSuccess,
        border: 'transparent',
        hoverBg: this.euiTheme.colors.backgroundFilledSuccess,
        hoverText: this.euiTheme.colors.textInverse,
      },
      neutral: {
        bg: this.euiTheme.colors.backgroundBasePlain,
        text: this.euiTheme.colors.textParagraph,
        border: this.euiTheme.colors.borderBasePlain,
        hoverBg: this.euiTheme.colors.backgroundFilledText,
        hoverText: this.euiTheme.colors.textInverse,
      },
    };

    const { bg, text, border, hoverBg, hoverText } = colors[variant];

    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = css`
      cursor: pointer;
      border: 1px solid ${border};
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
        border-color: ${hoverBg};
      }
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
}
