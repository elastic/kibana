/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EditorError } from '../../types';
import { ESQLMessage } from '../types';

export function wrapAsEditorMessage(
  type: 'error' | 'warning',
  messages: Array<ESQLMessage | EditorError>
): EditorError[] {
  return messages.map((e) => {
    if ('severity' in e) {
      return e;
    }
    const startPosition = e.location ? e.location.min + 1 : 0;
    const endPosition = e.location ? e.location.max + 1 : 0;
    return {
      message: e.text,
      startColumn: startPosition,
      startLineNumber: 1,
      endColumn: endPosition + 1,
      endLineNumber: 1,
      severity: type,
      _source: 'client' as const,
      code: e.code,
    };
  });
}
