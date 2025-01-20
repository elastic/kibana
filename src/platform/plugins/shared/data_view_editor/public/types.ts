/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FC } from 'react';
import {
  ApplicationStart,
  IUiSettingsClient,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
  OverlayStart,
} from '@kbn/core/public';

import { EuiComboBoxOptionOption } from '@elastic/eui';

import type {
  DataView,
  DataViewsServicePublic,
  INDEX_PATTERN_TYPE,
  MatchedItem,
} from '@kbn/data-views-plugin/public';
import type { DataViewEditorService } from './data_view_editor_service';
import { DataPublicPluginStart, IndexPatternAggRestrictions } from './shared_imports';

export interface DataViewEditorContext {
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  http: HttpSetup;
  notifications: NotificationsStart;
  application: ApplicationStart;
  overlays: OverlayStart;
  dataViews: DataViewsServicePublic;
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
  /**
   * Pass the data view to be edited.
   */
  editData?: DataView;
  /**
   * if set to true user is presented with an option to create ad-hoc dataview without a saved object.
   */
  allowAdHocDataView?: boolean;

  /**
   * if set to true a link to the management page is shown
   */
  showManagementLink?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export type { DataViewEditorService };
export interface PluginStart {
  openEditor(options: DataViewEditorProps): () => void;
  IndexPatternEditorComponent: FC<DataViewEditorProps>;
  userPermissions: {
    editDataView: () => boolean;
  };
  /**
   * Helper method to generate a new data view editor service.
   * @param requireTimestampField - whether service requires requireTimestampField
   * @param initialValues - initial type, indexPattern, and name to populate service
   * @returns DataViewEditorService
   */
  dataViewEditorServiceFactory: () => Promise<typeof import('./data_view_editor_service_lazy')>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

export interface StartPlugins {
  data: DataPublicPluginStart;
  dataViews: DataViewsServicePublic;
}

export type CloseEditor = () => void;

// end for index matches

export interface IndexPatternTableItem {
  id: string;
  title: string;
  default: boolean;
  tag?: string[];
  sort: string;
}

export interface RollupIndiciesCapability {
  aggs: Record<string, IndexPatternAggRestrictions>;
  error: string;
}

export type RollupIndicesCapsResponse = Record<string, RollupIndiciesCapability>;

export interface IndexPatternConfig {
  title: string;
  timestampField?: EuiComboBoxOptionOption<string>;
  allowHidden: boolean;
  id?: string;
  type: INDEX_PATTERN_TYPE;
  name?: string;
  isAdHoc: boolean;
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
