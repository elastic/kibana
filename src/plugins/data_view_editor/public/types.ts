/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';
import {
  ApplicationStart,
  IUiSettingsClient,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
} from '@kbn/core/public';

import { EuiComboBoxOptionOption } from '@elastic/eui';

import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart, IndexPatternAggRestrictions } from './shared_imports';

export interface DataViewEditorContext {
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  http: HttpSetup;
  notifications: NotificationsStart;
  application: ApplicationStart;
  dataViews: DataViewsPublicPluginStart;
  searchClient: DataPublicPluginStart['search']['search'];
}

/** @public */
export interface DataViewEditorProps {
  /**
   * Handler for the "save" footer button
   * @param indexPattern - newly created index pattern
   */
  onSave: (dataView: DataView) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel?: () => void;
  /**
   * Sets the default index pattern type to rollup. Defaults to false.
   */
  defaultTypeIsRollup?: boolean;
  /**
   * Sets whether a timestamp field is required to create an index pattern. Defaults to false.
   */
  requireTimestampField?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export interface PluginStart {
  openEditor(options: DataViewEditorProps): () => void;
  IndexPatternEditorComponent: FC<DataViewEditorProps>;
  userPermissions: {
    editDataView: () => boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

export interface StartPlugins {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
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

export enum ResolveIndexResponseItemIndexAttrs {
  OPEN = 'open',
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  FROZEN = 'frozen',
}

export interface RollupIndiciesCapability {
  aggs: Record<string, IndexPatternAggRestrictions>;
  error: string;
}

export type RollupIndicesCapsResponse = Record<string, RollupIndiciesCapability>;

export enum INDEX_PATTERN_TYPE {
  ROLLUP = 'rollup',
  DEFAULT = 'default',
}

export interface IndexPatternConfig {
  title: string;
  timestampField?: EuiComboBoxOptionOption<string>;
  allowHidden: boolean;
  id?: string;
  type: INDEX_PATTERN_TYPE;
}

export interface FormInternal extends Omit<IndexPatternConfig, 'timestampField'> {
  timestampField?: TimestampOption;
}

export interface TimestampOption {
  display: string;
  fieldName?: string;
}

export interface MatchedIndicesSet {
  allIndices: MatchedItem[];
  exactMatchedIndices: MatchedItem[];
  partialMatchedIndices: MatchedItem[];
  visibleIndices: MatchedItem[];
}
