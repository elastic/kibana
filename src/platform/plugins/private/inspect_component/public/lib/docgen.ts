/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

/** A single prop's type information from react-docgen-typescript. */
export interface DocgenPropType {
  /** Raw type string, e.g. '"primary" | "success" | "warning" | "danger"' */
  name: string;
  /** Union members if the type is a string literal union. */
  value?: Array<{ value: string }>;
}

export interface DocgenProp {
  name: string;
  type: DocgenPropType;
  defaultValue: { value: string } | null;
  description: string;
  required: boolean;
}

/** Keyed by prop name. */
export type DocgenProps = Record<string, DocgenProp>;

export interface FetchDocgenOptions {
  httpService: HttpStart;
  /** Display name of the component (e.g. 'EuiCard'). */
  component: string;
  /** Absolute path of the file that imports the component. */
  from: string;
}

export type FetchDocgenResult =
  | { ok: true; props: DocgenProps }
  | { ok: false; error: 'resolve_failed' | 'parse_failed' | 'server_error' };

export const fetchDocgen = async ({
  httpService,
  component,
  from,
}: FetchDocgenOptions): Promise<FetchDocgenResult> => {
  try {
    const result = await httpService.get<FetchDocgenResult>('/internal/inspect_component/docgen', {
      query: { component, from },
    });
    return result;
  } catch {
    return { ok: false, error: 'server_error' };
  }
};
