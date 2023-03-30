/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { Storage } from '@kbn/kibana-utils-plugin/public';

export enum ElasticRequestState {
  Loading,
  NotFound,
  Found,
  Error,
  NotFoundDataView,
}

export interface DocProps {
  /**
   * ID of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string;
  /**
   * DataView entity
   */
  dataView: DataView;
  /**
   * If set, will always request source, regardless of the global `fieldsFromSource` setting
   */
  requestSource?: boolean;
  /**
   * Discover main view url
   */
  referrer?: string;
}

export interface UnifiedDocViewerServices {
  /**
   * Used for querying documents from ES
   */
  data: DataPublicPluginStart;
  /**
   * Used for formatting field values
   */
  fieldFormats: FieldFormatsStart;
  /**
   * Used for pinned fields & page size
   */
  storage: Storage;
  /**
   * Used for settings-based customizations (fields from source, legacy doc table)
   */
  uiSettings: IUiSettingsClient;
}
