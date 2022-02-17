/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Assign } from '@kbn/utility-types';
import { Spec } from 'vega';
import { EsQueryParser } from './es_query_parser';
import { EmsFileParser } from './ems_file_parser';
import { UrlParser } from './url_parser';

interface Body {
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
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

type AutoSize =
  | 'pad'
  | 'fit'
  | 'fit-x'
  | 'fit-y'
  | 'none'
  | {
      type: string;
      contains: string;
    }
  | { signal: string };

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
  kibana?: KibanaConfig;
  padding: Padding;
  projection: Projection;
  autosize: AutoSize;
  tooltips: TooltipConfig;
  mark: Mark;
}

interface Projection {
  name: string;
}

interface RequestDataObject<TUrlData = UrlObject> {
  name?: string;
  url?: TUrlData;
  values: estypes.SearchResponse;
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

export type VegaSpec = Assign<
  Spec,
  {
    [index: string]: any;
    $schema: string;
    data?: Data;
    encoding?: Encoding;
    mark?: string;
    title?: string;
    autosize?: AutoSize;
    projections?: Projection[];
    width?: number | 'container';
    height?: number | 'container';
    padding?: number | Padding;
    _hostConfig?: KibanaConfig;
    config: VegaSpecConfig;
  }
>;

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
  must?: estypes.QueryDslQueryContainer[];
  filter?: estypes.QueryDslQueryContainer[];
  should?: estypes.QueryDslQueryContainer[];
  must_not?: estypes.QueryDslQueryContainer[];
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

export interface CacheBounds {
  min: number;
  max: number;
}

interface Requests<TUrlData = UrlObject, TRequestDataObject = RequestDataObject<TUrlData>> {
  url: TUrlData;
  name: string;
  dataObject: TRequestDataObject;
}

export type EsQueryRequest = Requests;
export type EmsQueryRequest = Requests & {
  obj: UrlObject;
};

export interface ContextVarsObject {
  [index: string]: any;
  prop: ContextVarsObjectProps;
}

export interface TooltipConfig {
  position?: ToolTipPositions;
  padding?: number | Padding;
  centerOnMark?: boolean | number;
  textTruncate?: boolean;
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
