/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { RequestResult } from '../../../hooks/use_send_current_request/send_request';
import type { StatusCodeClassNames } from '../types';

const getStatusCodeClassNames = (statusCode: number, classNames: StatusCodeClassNames) => {
  if (statusCode <= 199) {
    return {
      blockClassName: classNames.monacoStatusCodeLineDefault,
      marginClassName: classNames.monacoStatusCodeLineNumberDefault,
    };
  }
  if (statusCode <= 299) {
    return {
      blockClassName: classNames.monacoStatusCodeLineSuccess,
      marginClassName: classNames.monacoStatusCodeLineNumberSuccess,
    };
  }
  if (statusCode <= 399) {
    return {
      blockClassName: classNames.monacoStatusCodeLinePrimary,
      marginClassName: classNames.monacoStatusCodeLineNumberPrimary,
    };
  }
  if (statusCode <= 499) {
    return {
      blockClassName: classNames.monacoStatusCodeLineWarning,
      marginClassName: classNames.monacoStatusCodeLineNumberWarning,
    };
  }
  return {
    blockClassName: classNames.monacoStatusCodeLineDanger,
    marginClassName: classNames.monacoStatusCodeLineNumberDanger,
  };
};

export const getStatusCodeDecorations = (
  data: RequestResult[],
  classNames: StatusCodeClassNames
) => {
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

      const { blockClassName, marginClassName } = getStatusCodeClassNames(
        response.statusCode,
        classNames
      );

      decorations.push({
        range,
        options: {
          isWholeLine: true,
          blockClassName,
          marginClassName,
        },
      });
      lastResponseEndLine += (response.value as string).split(/\\n|\n/).length;
    }
  });

  return decorations;
};
