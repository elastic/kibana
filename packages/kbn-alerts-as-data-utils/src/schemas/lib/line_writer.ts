/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const INDENT_LENGTH = 2;
const INDENT = ''.padStart(INDENT_LENGTH);

export class LineWriter {
  private _indent: string = '';
  private _lines: string[] = [];
  private _separator: string;

  constructor(separator: string = '\n') {
    this._indent = '';
    this._lines = [];
    this._separator = separator;
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
    return this._lines.join(this._separator);
  }
}

export const createLineWriter = (separator: string = '\n') => new LineWriter(separator);
