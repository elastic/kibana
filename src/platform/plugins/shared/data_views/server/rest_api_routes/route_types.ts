/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { SerializableRecord } from '@kbn/utility-types';
import { IFieldSubType } from '@kbn/es-query';
import { estypes } from '@elastic/elasticsearch';
import { RuntimePrimitiveTypes, RuntimeType } from '../../common/types';

// types for REST responses. separate but similar to other types to draw attention to REST api return changes

export type SourceFilterRestResponse = {
  value: string;
  clientId?: string | number;
};

export type AggregationRestrictionsRestResponse = Record<
  string,
  {
    agg?: string;
    interval?: number;
    fixed_interval?: string;
    calendar_interval?: string;
    delay?: string;
    time_zone?: string;
  }
>;

export type TypeMetaRestResponse = {
  aggs?: Record<string, AggregationRestrictionsRestResponse>;
  params?: {
    rollup_index: string;
  };
};

export type FieldAttrSetRestResponse = {
  customLabel?: string;
  customDescription?: string;
  count?: number;
};

export type FieldAttrsRestResponse = {
  [key: string]: FieldAttrSetRestResponse;
};

export type FieldFormatParamsRestRespons<P = {}> = SerializableRecord & P;

export type SerializedFieldFormatRestResponse<
  P = {},
  TParams extends FieldFormatParamsRestRespons<P> = FieldFormatParamsRestRespons<P>
> = {
  id?: string;
  params?: TParams;
};

export type RuntimeFieldBaseRestResponse = {
  type: RuntimeType;
  script?: {
    source: string;
  };
};

export type RuntimeFieldSpecRestResponse = RuntimeFieldBaseRestResponse & {
  fields?: Record<
    string,
    {
      type: RuntimePrimitiveTypes;
    }
  >;
};

export type DataViewFieldBaseRestResponse = {
  name: string;
  type: string;
  subType?: IFieldSubType;
  script?: string;
  lang?: estypes.ScriptLanguage;
  scripted?: boolean;
  esTypes?: string[];
};

export type FieldSpecRestResponse = DataViewFieldBaseRestResponse & {
  count?: number;
  conflictDescriptions?: Record<string, string[]>;
  format?: SerializedFieldFormatRestResponse;
  esTypes?: string[];
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues?: boolean;
  indexed?: boolean;
  customLabel?: string;
  customDescription?: string;
  runtimeField?: RuntimeFieldSpecRestResponse;
  fixedInterval?: string[];
  timeZone?: string[];
  timeSeriesDimension?: boolean;
  timeSeriesMetric?: 'histogram' | 'summary' | 'gauge' | 'counter' | 'position';
  shortDotsEnable?: boolean;
  isMapped?: boolean;
  parentName?: string;
};

export type DataViewFieldMap = Record<string, FieldSpecRestResponse>;

export type DataViewSpecRestResponse = {
  id?: string;
  version?: string;
  title?: string;
  timeFieldName?: string;
  sourceFilters?: SourceFilterRestResponse[];
  fields?: DataViewFieldMap;
  typeMeta?: TypeMetaRestResponse;
  type?: string;
  fieldFormats?: Record<string, SerializedFieldFormatRestResponse>;
  runtimeFieldMap?: Record<string, RuntimeFieldSpecRestResponse>;
  fieldAttrs?: FieldAttrsRestResponse;
  allowNoIndex?: boolean;
  namespaces?: string[];
  name?: string;
  allowHidden?: boolean;
};

export interface DataViewListItemRestResponse {
  id: string;
  namespaces?: string[];
  title: string;
  type?: string;
  typeMeta?: TypeMetaRestResponse;
  name?: string;
}

export interface DataViewsRuntimeResponseType {
  data_view: DataViewSpecRestResponse;
  fields: FieldSpecRestResponse[];
}

export interface IndexPatternsRuntimeResponseType {
  index_pattern: DataViewSpecRestResponse;
  field: FieldSpecRestResponse;
}

export interface RuntimeResponseType {
  body: DataViewsRuntimeResponseType | IndexPatternsRuntimeResponseType;
}

export interface FieldSubTypeRestResponse {
  multi?: { parent: string };
  nested?: { path: string };
}

export interface FieldDescriptorRestResponse {
  aggregatable: boolean;
  name: string;
  readFromDocValues: boolean;
  searchable: boolean;
  type: string;
  esTypes: string[];
  subType?: FieldSubTypeRestResponse;
  metadata_field?: boolean;
  fixedInterval?: string[];
  timeZone?: string[];
  timeSeriesMetric?: 'histogram' | 'summary' | 'counter' | 'gauge' | 'position';
  timeSeriesDimension?: boolean;
  conflictDescriptions?: Record<string, string[]>;
}
