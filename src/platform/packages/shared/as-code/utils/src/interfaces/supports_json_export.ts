/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SupportsJsonExport<
  State extends object = object,
  SanitizedState extends object = State
> {
  supportsJsonExport: boolean;
  apiPath?: string; // used if the embeddable has its own dedicated as-code API so that we can link to the console
  sanitizeState?: (dirtyState: State) => Promise<SanitizedState>;
}

export const apiSupportsJsonExport = (api: unknown | null): api is SupportsJsonExport =>
  Boolean((api as SupportsJsonExport).supportsJsonExport);
