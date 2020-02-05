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

/**
 * Everything the file imports is public
 */

// import * as color from './constants/color_default';
// import * as contentTypes from './content_types';
import { baseFormatters as baseFormatters1 } from './constants/base_formatters';

// import * as fieldFormatType from './field_format';
import { FieldFormatsRegistry as FieldFormatsRegistry1 }  from './field_formats_registry';
import { IFieldFormatType as IFieldFormatType1 } from './types';
// import * as utils from './utils';
// import * as formatters from './converters';

export namespace fieldFormats { 
  // types
  export const FieldFormatsRegistry = FieldFormatsRegistry1;
  // export import FieldFormat = fieldFormatType.FieldFormat;
  // export import GetConfigFn = types.GetConfigFn;
  // export import FIELD_FORMAT_IDS = types.FIELD_FORMAT_IDS;
  // export import ContentType = types.ContentType;
  // export import IFieldFormatConfig = types.IFieldFormatConfig;
  export type IFieldFormatType = IFieldFormatType1;
  // export import IFieldFormat = types.IFieldFormat;
  // export import IFieldFormatId = types.IFieldFormatId;

  // constants
  // export const HTML_CONTEXT_TYPE = contentTypes.HTML_CONTEXT_TYPE;
  // export const TEXT_CONTEXT_TYPE = contentTypes.TEXT_CONTEXT_TYPE;
  // export const DEFAULT_CONVERTER_COLOR = color.DEFAULT_CONVERTER_COLOR;
  export const baseFormatters = baseFormatters1;

  // utils
  // export const getHighlightRequest = utils.getHighlightRequest; 
  // export const asPrettyString = utils.asPrettyString; 
  // export const getHighlightHtml = utils.getHighlightHtml;

  // // formatter classes
  // export const BoolFormat = formatters.BoolFormat;
  // export const BytesFormat = formatters.BytesFormat;
  // export const ColorFormat = formatters.ColorFormat;
  // export const DateFormat = formatters.DateFormat;
  // export const DateNanosFormat = formatters.DateNanosFormat;
  // export const DurationFormat = formatters.DurationFormat;
  // export const IpFormat = formatters.IpFormat;
  // export const NumberFormat = formatters.NumberFormat;
  // export const PercentFormat = formatters.PercentFormat;
  // export const RelativeDateFormat = formatters.RelativeDateFormat;
  // export const SourceFormat = formatters.SourceFormat;
  // export const StaticLookupFormat = formatters.StaticLookupFormat;
  // export const UrlFormat = formatters.UrlFormat;
  // export const StringFormat = formatters.StringFormat;
  // export const TruncateFormat = formatters.TruncateFormat;
}
