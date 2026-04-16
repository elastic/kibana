/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum TypeStatus {
  Added = 'added',
  Removed = 'removed',
  Moved = 'moved',
  Untouched = 'untouched',
}

export interface TypeStatusDetails {
  currentIndex?: string;
  targetIndex?: string;
  status: TypeStatus;
}

// ensure plugins don't try to convert SO namespaceTypes after 8.0.0
// see https://github.com/elastic/kibana/issues/147344
export const ALLOWED_CONVERT_VERSION = '8.0.0';
