/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

export interface CommitPropOptions {
  httpService: HttpStart;
  file: string;
  lineNumber: number;
  columnNumber: number;
  propName: string;
  newValue: string | number | boolean;
  originalMtime: number;
}

export type CommitPropResult =
  | { ok: true; mtime: number }
  | {
      ok: false;
      error:
        | 'file_changed_on_disk'
        | 'prop_not_found'
        | 'computed_value'
        | 'spread_only'
        | 'server_error';
    };

export const commitProp = async ({
  httpService,
  file,
  lineNumber,
  columnNumber,
  propName,
  newValue,
  originalMtime,
}: CommitPropOptions): Promise<CommitPropResult> => {
  try {
    const result = await httpService.post<CommitPropResult>(
      '/internal/inspect_component/commit_prop',
      {
        body: JSON.stringify({ file, lineNumber, columnNumber, propName, newValue, originalMtime }),
      }
    );
    return result;
  } catch {
    return { ok: false, error: 'server_error' };
  }
};
