/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import RowParser from '../../../lib/row_parser';
import { ESRequest } from '../../../types';
import { SenseEditor } from '../../models/sense_editor';
import { formatRequestBodyDoc } from '../../../lib/utils';

export function restoreRequestFromHistory(editor: SenseEditor, req: ESRequest) {
  const coreEditor = editor.getCoreEditor();
  let pos = coreEditor.getCurrentPosition();
  let prefix = '';
  let suffix = '\n';
  const parser = new RowParser(coreEditor);
  if (parser.isStartRequestRow(pos.lineNumber)) {
    pos.column = 1;
    suffix += '\n';
  } else if (parser.isEndRequestRow(pos.lineNumber)) {
    const line = coreEditor.getLineValue(pos.lineNumber);
    pos.column = line.length + 1;
    prefix = '\n\n';
  } else if (parser.isInBetweenRequestsRow(pos.lineNumber)) {
    pos.column = 1;
  } else {
    pos = editor.nextRequestEnd(pos);
    prefix = '\n\n';
  }

  let s = prefix + req.method + ' ' + req.endpoint;
  if (req.data) {
    const indent = true;
    const formattedData = formatRequestBodyDoc([req.data], indent);
    s += '\n' + formattedData.data;
  }

  s += suffix;

  coreEditor.insert(pos, s);
  coreEditor.moveCursorToPosition({ lineNumber: pos.lineNumber + prefix.length, column: 1 });
  coreEditor.clearSelection();
  coreEditor.getContainer().focus();
}
