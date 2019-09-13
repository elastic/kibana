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

export function restoreRequestFromHistory(input: any, req: any) {
  const session = input.getSession();
  let pos = input.getCursorPosition();
  let prefix = '';
  let suffix = '\n';
  if (input.parser.isStartRequestRow(pos.row)) {
    pos.column = 0;
    suffix += '\n';
  } else if (input.parser.isEndRequestRow(pos.row)) {
    const line = session.getLine(pos.row);
    pos.column = line.length;
    prefix = '\n\n';
  } else if (input.parser.isInBetweenRequestsRow(pos.row)) {
    pos.column = 0;
  } else {
    pos = input.nextRequestEnd(pos);
    prefix = '\n\n';
  }

  let s = prefix + req.method + ' ' + req.endpoint;
  if (req.data) {
    s += '\n' + req.data;
  }

  s += suffix;

  session.insert(pos, s);
  input.clearSelection();
  input.moveCursorTo(pos.row + prefix.length, 0);
  input.focus();
}
