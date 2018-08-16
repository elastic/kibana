/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

'use strict';

import { editor as Editor } from 'monaco-editor';
import { Hover, MarkedString } from 'vscode-languageserver-types';
import { parseUri } from '../../common/uri_util';
import { ContentWidget } from './content_widget';
import { HoverComputer } from './hover_computer';
import { Operation } from './operation';

export class ContentHoverWidget extends ContentWidget {
  public static ID = 'editor.contrib.contentHoverWidget';
  private hoverOperation: Operation<Hover>;
  private computer: HoverComputer;
  private lastRange: any | null = null;
  private shouldFocus: boolean = false;

  constructor(editor: Editor.ICodeEditor) {
    super(ContentHoverWidget.ID, editor);
    this.containerDomNode.className = 'monaco-editor-hover hidden';
    this.containerDomNode.tabIndex = 0;
    this.domNode.className = 'monaco-editor-hover-content';
    this.domNode.style.cssText = 'width: 100%';
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
    if (this.lastRange && this.lastRange.equalsRange(range)) {
      return;
    }
    this.hoverOperation.cancel();
    const uri = this.editor.getModel().uri;
    const { repoUri, file } = parseUri(uri);
    if (this.isVisible) {
      this.hide();
    }
    this.computer.setParams(repoUri, file, range);
    this.hoverOperation.start();
    this.lastRange = range;
    this.shouldFocus = focus;
  }

  private result(result: Hover, complete: boolean) {
    if (this.lastRange && result) {
      this.renderMessages(this.lastRange, result);
    } else if (complete) {
      this.hide();
    }
  }

  private renderMessages(renderRange: any, result: Hover) {
    let renderColumn = Number.MAX_VALUE;
    const fragment = document.createDocumentFragment();

    if (!result.range) {
      return;
    }

    renderColumn = Math.min(renderColumn, result.range.start.character + 1);
    if (!Array.isArray(result.contents)) {
      result.contents = [result.contents as MarkedString];
    }
    (result.contents as MarkedString[]).filter(contents => !!contents).forEach(markedString => {
      let markdown: string;
      if (typeof markedString === 'string') {
        markdown = markedString;
      } else {
        markdown = '```' + markedString.language + '\n' + markedString.value + '\n```';
      }
      const renderedContents = window.monaco.renderer.renderMarkdown(
        { value: markdown },
        {
          codeBlockRenderer: (language: string, value: string) => {
            const code = window.monaco.tokenizer.tokenizeToString(value, language);
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
    this.showAt(
      new window.monaco.Position(renderRange.startLineNumber, renderColumn),
      this.shouldFocus
    );

    this.updateContents(fragment);
  }

  private renderButtons() {
    const buttonGroup = document.createElement('div');
    buttonGroup.className =
      'euiFlexGroup euiFlexGroup--gutterSmall euiFlexGroup--directionRow euiFlexGroup--responsive';
    buttonGroup.style.cssText = 'padding: 4px 5px; border-top: 1px solid rgba(200, 200, 200, 0.5)';
    buttonGroup.innerHTML = `
    <button class="euiFlexItem euiButton euiButton--primary euiButton--small" type="button">
      <span class="euiButton__content">
        <span class="euiButton__text">Goto Definition</span>
      </span>
    </button>
    <button class="euiFlexItem euiButton euiButton--primary euiButton--small" type="button">
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
}
