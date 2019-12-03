/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ace from 'brace';
import { Editor as IAceEditor } from 'brace';
import $ from 'jquery';
import { CoreEditor, Position, Range, Token, TokensProvider, EditorEvent } from '../../../types';
import { AceTokensProvider } from '../../../lib/ace_token_provider';
import * as curl from '../sense_editor/curl';

// @ts-ignore
import * as InputMode from '../sense_editor/mode/input';

const _AceRange = ace.acequire('ace/range').Range;

export class LegacyCoreEditor implements CoreEditor {
  private _aceOnPaste: any;
  $actions: any;

  constructor(private readonly editor: IAceEditor, actions: HTMLElement) {
    this.$actions = $(actions);
    this.editor.setShowPrintMargin(false);

    const session = this.editor.getSession();
    session.setMode(new InputMode.Mode());
    (session as any).setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);

    // Intercept ace on paste handler.
    this._aceOnPaste = this.editor.onPaste;
    this.editor.onPaste = this.DO_NOT_USE_onPaste.bind(this);

    this.editor.setOptions({
      enableBasicAutocompletion: true,
    });

    this.editor.$blockScrolling = Infinity;
    this.hideActionsBar();
    this.editor.focus();
  }

  // dirty check for tokenizer state, uses a lot less cycles
  // than listening for tokenizerUpdate
  waitForLatestTokens(): Promise<void> {
    return new Promise(resolve => {
      const session = this.editor.getSession();
      const checkInterval = 25;

      const check = () => {
        // If the bgTokenizer doesn't exist, we can assume that the underlying editor has been
        // torn down, e.g. by closing the History tab, and we don't need to do anything further.
        if (session.bgTokenizer) {
          // Wait until the bgTokenizer is done running before executing the callback.
          if ((session.bgTokenizer as any).running) {
            setTimeout(check, checkInterval);
          } else {
            resolve();
          }
        }
      };

      setTimeout(check, 0);
    });
  }

  getLineState(lineNumber: number) {
    const session = this.editor.getSession();
    return session.getState(lineNumber - 1);
  }

  getValueInRange({ start, end }: Range): string {
    const aceRange = new _AceRange(
      start.lineNumber - 1,
      start.column - 1,
      end.lineNumber - 1,
      end.column - 1
    );
    return this.editor.getSession().getTextRange(aceRange);
  }

  getTokenProvider(): TokensProvider {
    return new AceTokensProvider(this.editor.getSession());
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setValue(text: string, forceRetokenize: boolean): Promise<void> {
    const session = this.editor.getSession();
    session.setValue(text);
    return new Promise(resolve => {
      if (!forceRetokenize) {
        // resolve immediately
        resolve();
        return;
      }

      // force update of tokens, but not on this thread to allow for ace rendering.
      setTimeout(function() {
        let i;
        for (i = 0; i < session.getLength(); i++) {
          session.getTokens(i);
        }
        resolve();
      });
    });
  }

  getLineValue(lineNumber: number): string {
    const session = this.editor.getSession();
    return session.getLine(lineNumber - 1);
  }

  getCurrentPosition(): Position {
    const cursorPosition = this.editor.getCursorPosition();
    return {
      lineNumber: cursorPosition.row + 1,
      column: cursorPosition.column + 1,
    };
  }

  clearSelection(): void {
    this.editor.clearSelection();
  }

  getTokenAt(pos: Position): Token | null {
    const provider = this.getTokenProvider();
    return provider.getTokenAt(pos);
  }

  insert(valueOrPos: string | Position, value?: string): void {
    if (typeof valueOrPos === 'string') {
      this.editor.insert(valueOrPos);
      return;
    }
    const document = this.editor.getSession().getDocument();
    document.insert(
      {
        column: valueOrPos.column - 1,
        row: valueOrPos.lineNumber - 1,
      },
      value || ''
    );
  }

  moveCursorToPosition(pos: Position): void {
    this.editor.moveCursorToPosition({ row: pos.lineNumber - 1, column: pos.column - 1 });
  }

  replace({ start, end }: Range, value: string): void {
    const aceRange = new _AceRange(
      start.lineNumber - 1,
      start.column - 1,
      end.lineNumber - 1,
      end.column - 1
    );
    const session = this.editor.getSession();
    session.replace(aceRange, value);
  }

  getLines(startLine: number, endLine: number): string[] {
    const session = this.editor.getSession();
    return session.getLines(startLine - 1, endLine - 1);
  }

  replaceRange(range: Range, value: string) {
    const pos = this.editor.getCursorPosition();
    this.editor.getSession().replace(
      new _AceRange({
        startRow: range.start.lineNumber - 1,
        startColumn: range.start.column - 1,
        endRow: range.end.lineNumber - 1,
        endColumn: range.end.column - 1,
      }),
      value
    );
    const maxRow = Math.max(range.start.lineNumber - 1 + value.split('\n').length - 1, 0);
    pos.row = Math.min(pos.row, maxRow);
    this.editor.moveCursorToPosition(pos);
    // ACE UPGRADE - check if needed - at the moment the above may trigger a selection.
    this.editor.clearSelection();
  }

  getSelectionRange() {
    const result = this.editor.getSelectionRange();
    return {
      start: {
        lineNumber: result.start.row + 1,
        column: result.start.column + 1,
      },
      end: {
        lineNumber: result.end.row + 1,
        column: result.end.column + 1,
      },
    };
  }

  getLineCount() {
    const text = this.getValue();
    return text.split('\n').length;
  }

  moveCursorTo(pos: Position) {
    this.editor.moveCursorTo(pos.lineNumber - 1, pos.column - 1);
  }

  addMarker(range: Range) {
    return this.editor
      .getSession()
      .addMarker(
        new _AceRange(
          range.start.lineNumber - 1,
          range.start.column - 1,
          range.end.lineNumber - 1,
          range.end.column - 1
        ),
        'ace_snippet-marker',
        'fullLine',
        false
      );
  }

  removeMarker(ref: any) {
    this.editor.getSession().removeMarker(ref);
  }

  getWrapLimit(): number {
    return this.editor.getSession().getWrapLimit();
  }

  on(event: EditorEvent, listener: () => void) {
    if (event === 'changeCursor') {
      this.editor.getSession().selection.on(event, listener);
    } else if (event === 'changeSelection') {
      this.editor.on(event, listener);
    } else {
      this.editor.getSession().on(event, listener);
    }
  }

  off(event: EditorEvent, listener: () => void) {
    if (event === 'changeSelection') {
      this.editor.off(event, listener);
    }
  }

  isCompleterActive() {
    // Secrets of the arcane here.
    return Boolean((this.editor as any).completer && (this.editor as any).completer.activated);
  }

  // eslint-disable-next-line @typescript-eslint/camelcase
  private DO_NOT_USE_onPaste(text: string) {
    if (text && curl.detectCURL(text)) {
      const curlInput = curl.parseCURL(text);
      this.editor.insert(curlInput);
      return;
    }
    this._aceOnPaste.call(this.editor, text);
  }

  private setActionsBar = (top?: any) => {
    if (top === null) {
      this.$actions.css('visibility', 'hidden');
    } else {
      this.$actions.css({
        top,
        visibility: 'visible',
      });
    }
  };

  private hideActionsBar = () => {
    this.setActionsBar();
  };

  execCommand(cmd: string) {
    this.editor.execCommand(cmd);
  }

  getContainer(): HTMLDivElement {
    return this.editor.container as HTMLDivElement;
  }

  legacyUpdateUI(range: any) {
    if (!this.$actions) {
      return;
    }
    if (range) {
      // elements are positioned relative to the editor's container
      // pageY is relative to page, so subtract the offset
      // from pageY to get the new top value
      const offsetFromPage = $(this.editor.container).offset()!.top;
      const startLineNumber = range.start.lineNumber;
      const startColumn = range.start.column;
      const firstLine = this.getLineValue(startLineNumber);
      const maxLineLength = this.getWrapLimit() - 5;
      const isWrapping = firstLine.length > maxLineLength;
      const getScreenCoords = (row: number) =>
        this.editor.renderer.textToScreenCoordinates(row, startColumn).pageY - offsetFromPage;
      const topOfReq = getScreenCoords(startLineNumber);

      if (topOfReq >= 0) {
        let offset = 0;
        if (isWrapping) {
          // Try get the line height of the text area in pixels.
          const textArea = $(this.editor.container.querySelector('textArea')!);
          const hasRoomOnNextLine = this.getLineValue(startLineNumber + 1).length < maxLineLength;
          if (textArea && hasRoomOnNextLine) {
            // Line height + the number of wraps we have on a line.
            offset += this.getLineValue(startLineNumber).length * textArea.height()!;
          } else {
            if (startLineNumber > 0) {
              this.setActionsBar(getScreenCoords(startLineNumber - 1));
              return;
            }
            this.setActionsBar(getScreenCoords(startLineNumber + 1));
            return;
          }
        }
        this.setActionsBar(topOfReq + offset);
        return;
      }

      const bottomOfReq =
        this.editor.renderer.textToScreenCoordinates(range.end.lineNumber, range.end.column).pageY -
        offsetFromPage;

      if (bottomOfReq >= 0) {
        this.setActionsBar(0);
        return;
      }
    }
  }
}
