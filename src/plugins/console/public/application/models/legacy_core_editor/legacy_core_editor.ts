/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { Editor as IAceEditor, IEditSession as IAceEditSession } from 'brace';
import $ from 'jquery';
import {
  CoreEditor,
  Position,
  Range,
  Token,
  TokensProvider,
  EditorEvent,
  AutoCompleterFunction,
} from '../../../types';
import { AceTokensProvider } from '../../../lib/ace_token_provider';
import * as curl from '../sense_editor/curl';
import smartResize from './smart_resize';

// @ts-ignore
import * as InputMode from './mode/input';

const _AceRange = ace.acequire('ace/range').Range;

const rangeToAceRange = ({ start, end }: Range) =>
  new _AceRange(start.lineNumber - 1, start.column - 1, end.lineNumber - 1, end.column - 1);

export class LegacyCoreEditor implements CoreEditor {
  private _aceOnPaste: Function;
  $actions: JQuery<HTMLElement>;
  resize: () => void;

  constructor(private readonly editor: IAceEditor, actions: HTMLElement) {
    this.$actions = $(actions);
    this.editor.setShowPrintMargin(false);

    const session = this.editor.getSession();
    session.setMode(new InputMode.Mode());
    (session as unknown as { setFoldStyle: (style: string) => void }).setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);

    this.resize = smartResize(this.editor);

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
    return new Promise<void>((resolve) => {
      const session = this.editor.getSession();
      const checkInterval = 25;

      const check = () => {
        // If the bgTokenizer doesn't exist, we can assume that the underlying editor has been
        // torn down, e.g. by closing the History tab, and we don't need to do anything further.
        if (session.bgTokenizer) {
          // Wait until the bgTokenizer is done running before executing the callback.
          if ((session.bgTokenizer as unknown as { running: boolean }).running) {
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

  getValueInRange(range: Range): string {
    return this.editor.getSession().getTextRange(rangeToAceRange(range));
  }

  getTokenProvider(): TokensProvider {
    return new AceTokensProvider(this.editor.getSession());
  }

  getValue(): string {
    return this.editor.getValue();
  }

  async setValue(text: string, forceRetokenize: boolean): Promise<void> {
    const session = this.editor.getSession();
    session.setValue(text);
    if (forceRetokenize) {
      await this.forceRetokenize();
    }
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

  replace(range: Range, value: string): void {
    const session = this.editor.getSession();
    session.replace(rangeToAceRange(range), value);
  }

  getLines(startLine: number, endLine: number): string[] {
    const session = this.editor.getSession();
    return session.getLines(startLine - 1, endLine - 1);
  }

  replaceRange(range: Range, value: string) {
    const pos = this.editor.getCursorPosition();
    this.editor.getSession().replace(rangeToAceRange(range), value);

    const maxRow = Math.max(range.start.lineNumber - 1 + value.split('\n').length - 1, 1);
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
    // Only use this function to return line count as it uses
    // a cache.
    return this.editor.getSession().getLength();
  }

  addMarker(range: Range) {
    return this.editor
      .getSession()
      .addMarker(rangeToAceRange(range), 'ace_snippet-marker', 'fullLine', false);
  }

  removeMarker(ref: number) {
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
    return Boolean(
      (this.editor as unknown as { completer: { activated: unknown } }).completer &&
        (this.editor as unknown as { completer: { activated: unknown } }).completer.activated
    );
  }

  private forceRetokenize() {
    const session = this.editor.getSession();
    return new Promise<void>((resolve) => {
      // force update of tokens, but not on this thread to allow for ace rendering.
      setTimeout(function () {
        let i;
        for (i = 0; i < session.getLength(); i++) {
          session.getTokens(i);
        }
        resolve();
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private DO_NOT_USE_onPaste(text: string) {
    if (text && curl.detectCURL(text)) {
      const curlInput = curl.parseCURL(text);
      this.editor.insert(curlInput);
      return;
    }
    this._aceOnPaste.call(this.editor, text);
  }

  private setActionsBar = (value: number | null, topOrBottom: 'top' | 'bottom' = 'top') => {
    if (value === null) {
      this.$actions.css('visibility', 'hidden');
    } else {
      if (topOrBottom === 'top') {
        this.$actions.css({
          bottom: 'auto',
          top: value,
          visibility: 'visible',
        });
      } else {
        this.$actions.css({
          top: 'auto',
          bottom: value,
          visibility: 'visible',
        });
      }
    }
  };

  private hideActionsBar = () => {
    this.setActionsBar(null);
  };

  execCommand(cmd: string) {
    this.editor.execCommand(cmd);
  }

  getContainer(): HTMLDivElement {
    return this.editor.container as HTMLDivElement;
  }

  setStyles(styles: { wrapLines: boolean; fontSize: string }) {
    this.editor.getSession().setUseWrapMode(styles.wrapLines);
    this.editor.container.style.fontSize = styles.fontSize;
  }

  registerKeyboardShortcut(opts: { keys: string; fn: () => void; name: string }): void {
    this.editor.commands.addCommand({
      exec: opts.fn,
      name: opts.name,
      bindKey: opts.keys,
    });
  }

  unregisterKeyboardShortcut(command: string) {
    // @ts-ignore
    this.editor.commands.removeCommand(command);
  }

  legacyUpdateUI(range: Range) {
    if (!this.$actions) {
      return;
    }
    if (range) {
      // elements are positioned relative to the editor's container
      // pageY is relative to page, so subtract the offset
      // from pageY to get the new top value
      const offsetFromPage = $(this.editor.container).offset()!.top;
      const startLine = range.start.lineNumber;
      const startColumn = range.start.column;
      const firstLine = this.getLineValue(startLine);
      const maxLineLength = this.getWrapLimit() - 5;
      const isWrapping = firstLine.length > maxLineLength;
      const totalOffset = offsetFromPage - (window.pageYOffset || 0);
      const getScreenCoords = (line: number) =>
        this.editor.renderer.textToScreenCoordinates(line - 1, startColumn).pageY - totalOffset;
      const topOfReq = getScreenCoords(startLine);

      if (topOfReq >= 0) {
        const { bottom: maxBottom } = this.editor.container.getBoundingClientRect();
        if (topOfReq > maxBottom - totalOffset) {
          this.setActionsBar(0, 'bottom');
          return;
        }
        let offset = 0;
        if (isWrapping) {
          // Try get the line height of the text area in pixels.
          const textArea = $(this.editor.container.querySelector('textArea')!);
          const hasRoomOnNextLine = this.getLineValue(startLine).length < maxLineLength;
          if (textArea && hasRoomOnNextLine) {
            // Line height + the number of wraps we have on a line.
            offset += this.getLineValue(startLine).length * textArea.height()!;
          } else {
            if (startLine > 1) {
              this.setActionsBar(getScreenCoords(startLine - 1));
              return;
            }
            this.setActionsBar(getScreenCoords(startLine + 1));
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

  registerAutocompleter(autocompleter: AutoCompleterFunction): void {
    // Hook into Ace

    // disable standard context based autocompletion.
    // @ts-ignore
    ace.define(
      'ace/autocomplete/text_completer',
      ['require', 'exports', 'module'],
      function (
        require: unknown,
        exports: {
          getCompletions: (
            innerEditor: unknown,
            session: unknown,
            pos: unknown,
            prefix: unknown,
            callback: (e: null | Error, values: string[]) => void
          ) => void;
        }
      ) {
        exports.getCompletions = function (innerEditor, session, pos, prefix, callback) {
          callback(null, []);
        };
      }
    );

    const langTools = ace.acequire('ace/ext/language_tools');

    langTools.setCompleters([
      {
        identifierRegexps: [
          /[a-zA-Z_0-9\.\$\-\u00A2-\uFFFF]/, // adds support for dot character
        ],
        getCompletions: (
          // eslint-disable-next-line @typescript-eslint/naming-convention
          DO_NOT_USE_1: IAceEditor,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          DO_NOT_USE_2: IAceEditSession,
          pos: { row: number; column: number },
          prefix: string,
          callback: (...args: unknown[]) => void
        ) => {
          const position: Position = {
            lineNumber: pos.row + 1,
            column: pos.column + 1,
          };
          autocompleter(position, prefix, callback);
        },
      },
    ]);
  }

  destroy() {
    this.editor.destroy();
  }
}
