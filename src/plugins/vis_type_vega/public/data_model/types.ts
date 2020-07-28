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

import { SearchResponse, SearchParams } from 'elasticsearch';
import { Filter } from 'src/plugins/data/public';
import { DslQuery } from 'src/plugins/data/common';
import { EsQueryParser } from './es_query_parser';
import { EmsFileParser } from './ems_file_parser';
import { UrlParser } from './url_parser';

interface Body {
  aggs?: SearchParams['body']['aggs'];
  query?: Query;
  timeout?: string;
}

interface Coordinate {
  axis: {
    title: string;
  };
  field: string;
}

interface Encoding {
  x: Coordinate;
  y: Coordinate;
}

interface AutoSize {
  type: string;
  contains: string;
}

interface Padding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Mark {
  color?: string;
  fill?: string;
}

type Renderer = 'svg' | 'canvas';

interface VegaSpecConfig extends KibanaConfig {
  kibana: KibanaConfig;
  padding: Padding;
  projection: Projection;
  autosize: AutoSize;
  tooltips: TooltipConfig;
  mark: Mark;
}

interface Projection {
  name: string;
}

interface RequestDataObject {
  values: SearchResponse<unknown>;
}

interface RequestObject {
  url: string;
}

type ContextVarsObjectProps =
  | string
  | {
      [CONSTANTS.AUTOINTERVAL]: number;
    };

type ToolTipPositions = 'top' | 'right' | 'bottom' | 'left';

export interface KibanaConfig {
  controlsLocation: ControlsLocation;
  controlsDirection: ControlsDirection;
  hideWarnings: boolean;
  type: string;
  renderer: Renderer;
}

export interface VegaSpec {
  [index: string]: any;
  $schema: string;
  data?: Data;
  encoding?: Encoding;
  mark?: string;
  title?: string;
  autosize: AutoSize;
  projections: Projection[];
  width?: number;
  height?: number;
  padding?: number | Padding;
  _hostConfig?: KibanaConfig;
  config: VegaSpecConfig;
}

export enum CONSTANTS {
  TIMEFILTER = '%timefilter%',
  CONTEXT = '%context%',
  LEGACY_CONTEXT = '%context_query%',
  TYPE = '%type%',
  SYMBOL = 'Symbol(vega_id)',
  AUTOINTERVAL = '%auautointerval%',
}

export interface Opts {
  [index: string]: any;
  [CONSTANTS.TIMEFILTER]?: boolean;
  gte?: string;
  lte?: string;
  format?: string;
  shift?: number;
  unit?: string;
}

export type Type = 'min' | 'max';

export interface TimeBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  [CONSTANTS.SYMBOL]: number;
}

export interface Bool {
  [index: string]: any;
  bool?: Bool;
  must?: DslQuery[];
  filter?: Filter[];
  should?: never[];
  must_not?: Filter[];
}

export interface Query {
  range?: { [x: number]: Opts };
  bool?: Bool;
}

export interface UrlObject {
  [index: string]: any;
  [CONSTANTS.TIMEFILTER]?: string;
  [CONSTANTS.CONTEXT]?: boolean;
  [CONSTANTS.LEGACY_CONTEXT]?: string;
  [CONSTANTS.TYPE]?: string;
  name?: string;
  index?: string;
  body?: Body;
  size?: number;
  timeout?: string;
}

export interface Data {
  [index: string]: any;
  url?: UrlObject;
  values?: unknown;
  source?: unknown;
}

export interface CacheOptions {
  max: number;
  maxAge: number;
}

export interface CacheBounds {
  min: number;
  max: number;
}

export interface Requests extends RequestObject {
  obj: RequestObject;
  name: string;
  dataObject: RequestDataObject;
}

export interface ContextVarsObject {
  [index: string]: any;
  prop: ContextVarsObjectProps;
  interval: string;
}

export interface TooltipConfig {
  position?: ToolTipPositions;
  padding?: number | Padding;
  centerOnMark?: boolean | number;
}

export interface DstObj {
  [index: string]: any;
  type?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  mapStyle?: string | boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
  delayRepaint?: boolean;
}

export type ControlsLocation = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export type ControlsDirection = 'horizontal' | 'vertical';

export interface VegaConfig extends DstObj {
  [index: string]: any;
  maxBounds?: number;
  tooltips?: TooltipConfig | boolean;
  controlsLocation?: ControlsLocation;
  controlsDirection?: ControlsDirection;
}

export interface UrlParserConfig {
  [index: string]: any;
  elasticsearch: EsQueryParser;
  emsfile: EmsFileParser;
  url: UrlParser;
}

export interface PendingType {
  [index: string]: any;
  dataObject?: Data;
  obj?: Data;
  url?: UrlObject;
  name?: string;
}
