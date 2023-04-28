/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const INDENT_LENGTH = 2;
const INDENT = ''.padStart(INDENT_LENGTH);

export class LineWriter {
  private _indent: string = '';
  private _lines: string[] = [];

  constructor() {
    this._indent = '';
    this._lines = [];
  }

  public addLine(line: string) {
    this._lines.push(`${this._indent}${line}`);
  }

  public addLineAndIndent(line: string) {
    this._lines.push(`${this._indent}${line}`);
    this._indent = `${this._indent}${INDENT}`;
  }

  public dedentAndAddLine(line: string) {
    this._indent = this._indent.substr(INDENT_LENGTH);
    this._lines.push(`${this._indent}${line}`);
  }

  public indent() {
    this._indent = `${this._indent}${INDENT}`;
  }

  public dedent() {
    this._indent = this._indent.substr(INDENT_LENGTH);
  }

  public getContent() {
    return this._lines.join('\n');
  }
}

export const createLineWriter = () => new LineWriter();
