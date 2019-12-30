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

import { PluginInitializerContext } from '../../../core/public';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DataPublicPlugin(initializerContext);
}

/**
 * Types to be shared externally
 * @public
 */
export { IRequestTypesMap, IResponseTypesMap } from './search';
export * from './types';
export {
  // field formats
  ContentType, // only used in agg_type
  FIELD_FORMAT_IDS,
  IFieldFormat,
  IFieldFormatId,
  IFieldFormatType,
  // index patterns
  IIndexPattern,
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
} from '../common';

/**
 * Static code to be shared externally
 * @public
 */
export * from './autocomplete_provider';
export * from './field_formats_provider';
export * from './index_patterns';
export * from './search';
export * from './query';
export * from './ui';
export {
  // es query
  esFilters,
  esKuery,
  esQuery,
  // field formats
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DateFormat,
  DateNanosFormat,
  DEFAULT_CONVERTER_COLOR,
  DurationFormat,
  FieldFormat,
  getHighlightRequest, // only used in search source
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  StringFormat,
  TEXT_CONTEXT_TYPE, // only used in agg_types
  TruncateFormat,
  UrlFormat,
  // index patterns
  isFilterable,
  // kbn field types
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
} from '../common';

// Export plugin after all other imports
import { DataPublicPlugin } from './plugin';
export { DataPublicPlugin as Plugin };
