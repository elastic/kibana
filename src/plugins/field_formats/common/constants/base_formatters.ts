/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BoolFormat } from '../converters/boolean';
import { BytesFormat } from '../converters/bytes';
import { ColorFormat } from '../converters/color';
import { DurationFormat } from '../converters/duration';
import { HistogramFormat } from '../converters/histogram';
import { IpFormat } from '../converters/ip';
import { NumberFormat } from '../converters/number';
import { PercentFormat } from '../converters/percent';
import { RelativeDateFormat } from '../converters/relative_date';
import { SourceFormat } from '../converters/source';
import { StaticLookupFormat } from '../converters/static_lookup';
import { StringFormat } from '../converters/string';
import { TruncateFormat } from '../converters/truncate';
import { UrlFormat } from '../converters/url';
import type { FieldFormatInstanceType } from '../types';

export const baseFormatters: FieldFormatInstanceType[] = [
  BoolFormat,
  BytesFormat,
  ColorFormat,
  DurationFormat,
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
