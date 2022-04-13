/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatInstanceType } from '../types';

import {
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DurationFormat,
  GeoPointFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  StringFormat,
  TruncateFormat,
  UrlFormat,
  HistogramFormat,
} from '../converters';

export const baseFormatters: FieldFormatInstanceType[] = [
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DurationFormat,
  GeoPointFormat,
  IpFormat,
  NumberFormat,
  PercentFormat,
  RelativeDateFormat,
  SourceFormat,
  StaticLookupFormat,
  StringFormat,
  TruncateFormat,
  UrlFormat,
  HistogramFormat,
];
