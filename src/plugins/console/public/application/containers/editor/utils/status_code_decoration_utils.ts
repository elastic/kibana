/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { RequestResult } from '../../../hooks/use_send_current_request/send_request';
import { STATUS_CODE_LINE_CLASSNAME } from './constants';

const getStatusCodeClassNameSuffix = (statusCode: number) => {
  if (statusCode <= 199) {
    return '--default';
  }
  if (statusCode <= 299) {
    return '--success';
  }
  if (statusCode <= 399) {
    return '--primary';
  }
  if (statusCode <= 499) {
    return '--warning';
  }
  return '--danger';
};

export const getStatusCodeDecorations = (data: RequestResult[]) => {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  let lastResponseEndLine = 0;

  data.forEach(({ response }) => {
    if (response?.value) {
      const range = {
        startLineNumber: lastResponseEndLine + 1,
        startColumn: 1,
        endLineNumber: lastResponseEndLine + 1,
        endColumn: 1, // It doesn't matter what endColumn we set as the decoration will be applied to the whole line
      };
      const classNameSuffix = getStatusCodeClassNameSuffix(response.statusCode);
      decorations.push({
        range,
        options: {
          isWholeLine: true,
          blockClassName: `${STATUS_CODE_LINE_CLASSNAME}${classNameSuffix}`,
          marginClassName: `${STATUS_CODE_LINE_CLASSNAME}_number${classNameSuffix}`,
        },
      });
      lastResponseEndLine += (response.value as string).split(/\\n|\n/).length;
    }
  });

  return decorations;
};
