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

import { ANTLRErrorListener, RecognitionException, Recognizer } from 'antlr4ts';

export interface PainlessError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

export class PainlessErrorListener implements ANTLRErrorListener<any> {
  private errors: PainlessError[] = [];

  syntaxError(
    recognizer: Recognizer<any, any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    e: RecognitionException | undefined
  ): void {
    let endColumn = column + 1;

    if (offendingSymbol?._text) {
      endColumn = column + offendingSymbol._text.length;
    }

    this.errors.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn,
      message,
    });
  }

  getErrors(): PainlessError[] {
    return this.errors;
  }
}
