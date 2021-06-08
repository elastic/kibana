/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from './shared_imports';
import { OpenEditorOptions } from './open_editor';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export interface PluginStart {
  openEditor(options: OpenEditorOptions): () => void;
  userPermissions: {
    editIndexPattern: () => boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

export interface StartPlugins {
  data: DataPublicPluginStart;
}

export type CloseEditor = () => void;

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

// for showing index matches
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
// end for index matches

export interface IndexPatternTableItem {
  id: string;
  title: string;
  default: boolean;
  tag?: string[];
  sort: string;
}
