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

import { Editor as IAceEditor, Range as AceRange } from 'brace';
import { CoreEditor, Position, Range, Token, TokensProvider } from '../../types';
import { AceTokensProvider } from '../../lib/ace_token_provider';

export class LegacyEditor implements CoreEditor {
  constructor(private readonly editor: IAceEditor) {}

  getLineState(lineNumber: number) {
    const session = this.editor.getSession();
    return session.getState(lineNumber - 1);
  }

  getValueInRange({ start, end }: Range): string {
    const session = this.editor.getSession();
    const aceRange = new AceRange(
      start.lineNumber - 1,
      start.column - 1,
      end.lineNumber - 1,
      end.column - 1
    );
    return session.doc.getTextRange(aceRange);
  }

  getTokenProvider(): TokensProvider {
    return new AceTokensProvider(this.editor.getSession());
  }

  getValue(): string {
    return this.editor.getValue();
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
    const aceRange = new AceRange(
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
}
