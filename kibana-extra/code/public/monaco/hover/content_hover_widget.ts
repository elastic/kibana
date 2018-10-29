/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

'use strict';

import { editor as Editor, languages, Range as EditorRange } from 'monaco-editor';
import DocumentHighlight = languages.DocumentHighlight;
// @ts-ignore
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/htmlContentRenderer';
// @ts-ignore
import { createCancelablePromise } from 'monaco-editor/esm/vs/base/common/async';
// @ts-ignore
import { tokenizeToString } from 'monaco-editor/esm/vs/editor/common/modes/textToHtmlTokenizer';
// @ts-ignore
import { getOccurrencesAtPosition } from 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter';

import { Hover, MarkedString, Range } from 'vscode-languageserver-types';
import { ContentWidget } from '../content_widget';
import { Operation } from '../operation';
import { HoverComputer } from './hover_computer';

export class ContentHoverWidget extends ContentWidget {
  public static ID = 'editor.contrib.contentHoverWidget';
  private static readonly DECORATION_OPTIONS = {
    className: 'wordHighlightStrong', //  hoverHighlight wordHighlightStrong
  };
  private hoverOperation: Operation<Hover>;
  private computer: HoverComputer;
  private lastRange: EditorRange | null = null;
  private shouldFocus: boolean = false;
  private eventsBound: boolean = false;
  private hoverResultAction?: (hover: Hover) => void = undefined;
  private highlightDecorations: string[] = [];

  constructor(editor: Editor.ICodeEditor) {
    super(ContentHoverWidget.ID, editor);
    this.containerDomNode.className = 'monaco-editor-hover hidden';
    this.containerDomNode.tabIndex = 0;
    this.domNode.className = 'monaco-editor-hover-content';
    this.computer = new HoverComputer();
    this.hoverOperation = new Operation(
      this.computer,
      result => this.result(result, true),
      () => void 0,
      result => this.result(result, false)
    );
    this.renderButtons();
  }

  public startShowingAt(range: any, focus: boolean) {
    if (this.isVisible && this.lastRange && this.lastRange.containsRange(range)) {
      return;
    }
    this.hoverOperation.cancel();
    const url = this.editor.getModel().uri.toString();
    if (this.isVisible) {
      this.hide();
    }
    this.computer.setParams(url, range);
    this.hoverOperation.start();
    this.lastRange = range;
    this.shouldFocus = focus;
  }

  public showAt(position: any, focus: boolean): void {
    super.showAt(position, focus);
    this.bindButtonEvents();
  }

  public setHoverResultAction(hoverResultAction: (hover: Hover) => void) {
    this.hoverResultAction = hoverResultAction;
  }

  public hide(): void {
    super.hide();
    this.highlightDecorations = this.editor.deltaDecorations(this.highlightDecorations, []);
  }

  private result(result: Hover, complete: boolean) {
    if (this.hoverResultAction) {
      // pass the result to redux
      this.hoverResultAction(result);
    }
    if (this.lastRange && result && result.contents) {
      this.renderMessages(this.lastRange, result);
    } else if (complete) {
      this.hide();
    }
  }

  private renderMessages(renderRange: EditorRange, result: Hover) {
    const fragment = document.createDocumentFragment();
    let contents = [];
    if (Array.isArray(result.contents)) {
      contents = result.contents;
    } else {
      contents = [result.contents as MarkedString];
    }
    if (contents.length === 0) {
      this.hide();
      return;
    }
    contents.filter(content => !!content).forEach(markedString => {
      let markdown: string;
      if (typeof markedString === 'string') {
        markdown = markedString;
      } else if (markedString.language) {
        markdown = '```' + markedString.language + '\n' + markedString.value + '\n```';
      } else {
        markdown = markedString.value;
      }
      const renderedContents = renderMarkdown(
        { value: markdown },
        {
          codeBlockRenderer: (language: string, value: string) => {
            const code = tokenizeToString(value, language);
            return `<span style="font-family: ${
              this.editor.getConfiguration().fontInfo.fontFamily
            }">${code}</span>`;
          },
        }
      );
      const el = document.createElement('div');
      el.classList.add('hover-row');
      el.appendChild(renderedContents);
      fragment.appendChild(el);
    });
    // show

    const startColumn = Math.min(
      renderRange.startColumn,
      result.range ? result.range.start.character + 1 : Number.MAX_VALUE
    );
    this.showAt(
      new window.monaco.Position(renderRange.startLineNumber, startColumn),
      this.shouldFocus
    );
    if (result.range) {
      this.lastRange = this.toMonacoRange(result.range);
      this.highlightOccurrences(this.lastRange);
    }
    this.updateContents(fragment);
  }

  private toMonacoRange(r: Range): EditorRange {
    return new window.monaco.Range(
      r.start.line + 1,
      r.start.character + 1,
      r.end.line + 1,
      r.end.character + 1
    );
  }

  private renderButtons() {
    const buttonGroup = document.createElement('div');
    buttonGroup.className =
      'euiFlexGroup euiFlexGroup--gutterSmall euiFlexGroup--directionRow euiFlexGroup--responsive';
    buttonGroup.style.cssText = 'padding: 4px 5px; border-top: 1px solid rgba(200, 200, 200, 0.5)';
    buttonGroup.innerHTML = `
    <button id="btnDefinition" class="euiFlexItem euiButton euiButton--primary euiButton--small" type="button">
      <span class="euiButton__content">
        <span class="euiButton__text">Goto Definition</span>
      </span>
    </button>
    <button id="btnReferences" class="euiFlexItem euiButton euiButton--primary euiButton--small" type="button">
      <span class="euiButton__content">
        <span class="euiButton__text">Find Reference</span>
      </span>
    </button>
    <button class="euiFlexItem euiButton euiButton--primary euiButton--small" type="button">
      <span class="euiButton__content">
        <span class="euiButton__text">Go to Type</span>
      </span>
    </button>
   `;
    this.containerDomNode.appendChild(buttonGroup);
  }

  private gotoDefinition() {
    if (this.lastRange) {
      this.editor.setPosition({
        lineNumber: this.lastRange.startLineNumber,
        column: this.lastRange.startColumn,
      });
      const action = this.editor.getAction('editor.action.goToDeclaration');
      action.run().then(() => this.hide());
    }
  }

  private findReferences() {
    if (this.lastRange) {
      this.editor.setPosition({
        lineNumber: this.lastRange.startLineNumber,
        column: this.lastRange.startColumn,
      });
      const action = this.editor.getAction('editor.action.referenceSearch.trigger');
      action.run().then(() => this.hide());
    }
  }

  private bindButton(btnId: string, func: () => void) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', func);
      this.disposables.push({
        dispose() {
          btn.removeEventListener('click', func);
        },
      });
    }
  }

  private bindButtonEvents() {
    if (!this.eventsBound) {
      this.bindButton('btnDefinition', this.gotoDefinition.bind(this));
      this.bindButton('btnReferences', this.findReferences.bind(this));
      this.eventsBound = true;
    }
  }

  private highlightOccurrences(range: EditorRange) {
    const pos = new window.monaco.Position(range.startLineNumber, range.startColumn);
    return createCancelablePromise((token: any) =>
      getOccurrencesAtPosition(this.editor.getModel(), pos, token).then(
        (data: DocumentHighlight[]) => {
          if (data) {
            if (this.isVisible) {
              const decorations = data.map(h => ({
                range: h.range,
                options: ContentHoverWidget.DECORATION_OPTIONS,
              }));

              this.highlightDecorations = this.editor.deltaDecorations(
                this.highlightDecorations,
                decorations
              );
            }
          } else {
            this.highlightDecorations = this.editor.deltaDecorations(this.highlightDecorations, [
              {
                range,
                options: ContentHoverWidget.DECORATION_OPTIONS,
              },
            ]);
          }
        }
      )
    );
  }
}
