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
 * Field Formatters helper namespace:
 */

import {
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.
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
  FieldFormat,
  FieldFormatsRegistry, // exported only for tests. Consider mock.

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
  esKuery,
  esQuery,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
  // index patterns
  IIndexPattern,
  isFilterable,
  IFieldType,
  IFieldSubType,
  // kbn field types
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  // query
  Query,
  // timefilter
  RefreshInterval,
  TimeRange,
  // utils
  parseInterval,
  isNestedField,
  IFieldFormatsRegistry,
  FieldFormatsGetConfigFn,
  FieldFormatConfig,
} from '../common';

/**
 * Static code to be shared externally
 * @public
 */
export {
  IndexPatternsFetcher,
  FieldDescriptor,
  shouldReadFieldFromDocValues,
  indexPatterns,
} from './index_patterns';

export * from './search';

export {
  DataServerPlugin as Plugin,
  DataPluginSetup as PluginSetup,
  DataPluginStart as PluginStart,
};
