/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface MatchedItem {
  name: string;
  tags: Tag[];
  item: {
    name: string;
    backing_indices?: string[];
    timestamp_field?: string;
    indices?: string[];
    aliases?: string[];
    attributes?: ResolveIndexResponseItemIndexAttrs[];
    data_stream?: string;
  };
}

export interface ResolveIndexResponse {
  indices?: ResolveIndexResponseItemIndex[];
  aliases?: ResolveIndexResponseItemAlias[];
  data_streams?: ResolveIndexResponseItemDataStream[];
}

export interface ResolveIndexResponseItem {
  name: string;
}

export interface ResolveIndexResponseItemDataStream extends ResolveIndexResponseItem {
  backing_indices: string[];
  timestamp_field: string;
}

export interface ResolveIndexResponseItemAlias extends ResolveIndexResponseItem {
  indices: string[];
}

export interface ResolveIndexResponseItemIndex extends ResolveIndexResponseItem {
  aliases?: string[];
  attributes?: ResolveIndexResponseItemIndexAttrs[];
  data_stream?: string;
}

export enum ResolveIndexResponseItemIndexAttrs {
  OPEN = 'open',
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  FROZEN = 'frozen',
}

export interface Tag {
  name: string;
  key: string;
  color: string;
}
