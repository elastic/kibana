/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { SavedObject } from 'src/core/server';

export enum DatasetStatusTypes {
  NOT_INSTALLED = 'not_installed',
  INSTALLED = 'installed',
  UNKNOWN = 'unknown',
}
export interface SampleDatasetDashboardPanel {
  sampleDataId: string;
  dashboardId: string;
  oldEmbeddableId: string;
  embeddableId: string;
  embeddableType: EmbeddableTypes;
  embeddableConfig: object;
}
export enum EmbeddableTypes {
  MAP_SAVED_OBJECT_TYPE = 'map',
  SEARCH_EMBEDDABLE_TYPE = 'search',
  VISUALIZE_EMBEDDABLE_TYPE = 'visualization',
}
export interface DataIndexSchema {
  id: string;

  // path to newline delimented JSON file containing data relative to KIBANA_HOME
  dataPath: string;

  // Object defining Elasticsearch field mappings (contents of index.mappings.type.properties)
  fields: object;

  // times fields that will be updated relative to now when data is installed
  timeFields: string[];

  // Reference to now in your test data set.
  // When data is installed, timestamps are converted to the present time.
  // The distance between a timestamp and currentTimeMarker is preserved but the date and time will change.
  // For example:
  //   sample data set:    timestamp: 2018-01-01T00:00:00Z, currentTimeMarker: 2018-01-01T12:00:00Z
  //   installed data set: timestamp: 2018-04-18T20:33:14Z, currentTimeMarker: 2018-04-19T08:33:14Z
  currentTimeMarker: string;

  // Set to true to move timestamp to current week, preserving day of week and time of day
  // Relative distance from timestamp to currentTimeMarker will not remain the same
  preserveDayOfWeekTimeOfDay: boolean;
}

export interface AppLinkSchema {
  path: string;
  icon: string;
  label: string;
}

export interface SampleDatasetSchema {
  id: string;
  name: string;
  description: string;
  previewImagePath: string;
  darkPreviewImagePath: string;

  // saved object id of main dashboard for sample data set
  overviewDashboard: string;
  appLinks: AppLinkSchema[];

  // saved object id of default index-pattern for sample data set
  defaultIndex: string;

  // Kibana saved objects (index patter, visualizations, dashboard, ...)
  // Should provide a nice demo of Kibana's functionality with the sample data set
  savedObjects: SavedObject[];
  dataIndices: DataIndexSchema[];
  status?: string | undefined;
  statusMsg?: unknown;
}

export type SampleDatasetProvider = () => SampleDatasetSchema;
