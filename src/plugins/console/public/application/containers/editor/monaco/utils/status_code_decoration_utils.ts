/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { RequestResult } from '../../../../hooks/use_send_current_request/send_request';
import {
  DEFAULT_STATUS_BADGE_CLASSNAME,
  SUCCESS_STATUS_BADGE_CLASSNAME,
  PRIMARY_STATUS_BADGE_CLASSNAME,
  WARNING_STATUS_BADGE_CLASSNAME,
  DANGER_STATUS_BADGE_CLASSNAME,
} from './constants';

const getStatusCodeClassName = (statusCode: number) => {
  if (statusCode <= 199) {
    return DEFAULT_STATUS_BADGE_CLASSNAME;
  }
  if (statusCode <= 299) {
    return SUCCESS_STATUS_BADGE_CLASSNAME;
  }
  if (statusCode <= 399) {
    return PRIMARY_STATUS_BADGE_CLASSNAME;
  }
  if (statusCode <= 499) {
    return WARNING_STATUS_BADGE_CLASSNAME;
  }
  return DANGER_STATUS_BADGE_CLASSNAME;
};

export const getStatusCodeDecorations = (data: RequestResult[]) => {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  let lastResponseEndLine = 0;

  data.forEach(({ response }) => {
    if (response?.value) {
      const totalStatus =
        response.statusCode && response.statusText
          ? response.statusCode + ' ' + response.statusText
          : '';
      const startColumn = (response.value as string).indexOf(totalStatus) + 1;
      if (totalStatus && startColumn !== 0) {
        const range = {
          startLineNumber: lastResponseEndLine + 1,
          startColumn,
          endLineNumber: lastResponseEndLine + 1,
          endColumn: startColumn + totalStatus.length,
        };
        decorations.push({
          range,
          options: {
            inlineClassName: getStatusCodeClassName(response.statusCode),
          },
        });
      }
      lastResponseEndLine += (response.value as string).split(/\\n|\n/).length;
    }
  });

  return decorations;
};
