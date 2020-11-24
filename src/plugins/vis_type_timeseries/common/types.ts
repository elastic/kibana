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

import { TypeOf } from '@kbn/config-schema';
import { metricsItems, panel, seriesItems, visPayloadSchema } from './vis_schema';
import { PANEL_TYPES } from './panel_types';
import { TimeseriesUIRestrictions } from './ui_restrictions';

export type SeriesItemsSchema = TypeOf<typeof seriesItems>;
export type MetricsItemsSchema = TypeOf<typeof metricsItems>;
export type PanelSchema = TypeOf<typeof panel>;
export type VisPayload = TypeOf<typeof visPayloadSchema>;

interface PanelData {
  id: string;
  label: string;
  data: Array<[number, number]>;
}

// series data is not fully typed yet
interface SeriesData {
  [key: string]: {
    annotations: {
      [key: string]: unknown[];
    };
    id: string;
    series: PanelData[];
    error?: unknown;
  };
}

export type TimeseriesVisData = SeriesData & {
  type: PANEL_TYPES;
  uiRestrictions: TimeseriesUIRestrictions;
  /**
   * series array is responsible only for "table" vis type
   */
  series?: unknown[];
};
