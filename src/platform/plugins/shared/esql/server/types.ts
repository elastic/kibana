/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
export enum ResolveIndexResponseItemIndexAttrs {
  OPEN = 'open',
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  FROZEN = 'frozen',
}

export interface ResolveIndexResponseItemDataStream {
  name: string;
  backing_indices: string[];
  timestamp_field: string;
}

export interface ResolveIndexResponseItemAlias {
  name: string;
  indices: string[];
}

export interface ResolveIndexResponseItemIndex {
  name: string;
  aliases?: string[];
  attributes?: ResolveIndexResponseItemIndexAttrs[];
  data_stream?: string;
}

// for showing index matches
export interface ResolveIndexResponse {
  indices?: ResolveIndexResponseItemIndex[];
  aliases?: ResolveIndexResponseItemAlias[];
  data_streams?: ResolveIndexResponseItemDataStream[];
}
