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

import { PluginInitializerContext } from '../../../core/server';
import { DataServerPlugin, DataPluginSetup, DataPluginStart } from './plugin';

/*
 * esQuery and esKuery:
 */

import {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
  buildEsQuery,
  getEsQueryConfig,
} from '../common';

export const esKuery = {
  nodeTypes,
  fromKueryExpression,
  toElasticsearchQuery,
};

export const esQuery = {
  getEsQueryConfig,
  buildEsQuery,
};

export { EsQueryConfig, KueryNode } from '../common';

/*
 * Field Formats:
 */

import {
  FieldFormatsRegistry,
  FieldFormat,
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
} from '../common/field_formats';

export const fieldFormats = {
  FieldFormatsRegistry,
  FieldFormat,

  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DurationFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  UrlFormat,
  StringFormat,
  TruncateFormat,
};

export { IFieldFormatsRegistry, FieldFormatsGetConfigFn, FieldFormatConfig } from '../common';

/*
 * Index patterns:
 */

import { isNestedField, isFilterable } from '../common';

export const indexPatterns = {
  isFilterable,
  isNestedField,
};

export {
  IndexPatternsFetcher,
  FieldDescriptor as IndexPatternFieldDescriptor,
  shouldReadFieldFromDocValues, // used only in logstash_fields fixture
} from './index_patterns';

export {
  IIndexPattern,
  IFieldType,
  IFieldSubType,
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
} from '../common';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataServerPlugin(initializerContext);
}

/**
 * Types to be shared externally
 * @public
 */
export { IRequestTypesMap, IResponseTypesMap } from './search';

export {
  // es query
  esFilters,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
  // query
  Query,
  // timefilter
  RefreshInterval,
  TimeRange,
  // utils
  parseInterval,
} from '../common';

/**
 * Static code to be shared externally
 * @public
 */

export * from './search';

export {
  DataServerPlugin as Plugin,
  DataPluginSetup as PluginSetup,
  DataPluginStart as PluginStart,
};
