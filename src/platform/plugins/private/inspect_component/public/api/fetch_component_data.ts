/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

/**
 * Options for {@link fetchComponentData}.
 */
interface FetchComponentDataOptions {
  /** {@link HttpStart} */
  httpService: HttpStart;
  /** Full component path. */
  fileName: string;
  /** 1-indexed line number of the JSX element in the source file. */
  lineNumber?: number;
  /** 1-indexed column number of the JSX element in the source file. */
  columnNumber?: number;
}

/**
 * Response type for POST '/internal/inspect_component/inspect' route.
 */
export interface InspectComponentResponse {
  /** List of all teams who are codeowners for the file. */
  codeowners: string[];
  /** File path relative to the repository root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
  /** Prop names explicitly written in the JSX source at the component's line. */
  explicitProps: string[];
  /** File modification time in milliseconds since epoch. */
  mtime: number;
}

/**
 * Fetch component data.
 * @async
 */
export const fetchComponentData = async ({
  httpService,
  fileName,
  lineNumber,
  columnNumber,
}: FetchComponentDataOptions): Promise<InspectComponentResponse | null> => {
  try {
    const response: InspectComponentResponse = await httpService.post(
      '/internal/inspect_component/inspect',
      {
        body: JSON.stringify({ path: fileName, lineNumber, columnNumber }),
      }
    );

    return response;
  } catch (e) {
    return null;
  }
};
