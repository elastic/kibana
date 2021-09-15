/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KbnRegistryItemLoader } from '../../../kibana_utils/common';
import { FIELD_FORMAT_IDS, FieldFormatInstanceType } from '../../common';

export const baseFormattersPublic: Array<KbnRegistryItemLoader<FieldFormatInstanceType>> = [
  {
    id: FIELD_FORMAT_IDS.DATE,
    load: () => import('./converters').then((m) => m.DateFormat),
  },
  {
    id: FIELD_FORMAT_IDS.DATE_NANOS,
    load: () => import('./converters').then((m) => m.DateNanosFormat),
  },
  {
    id: FIELD_FORMAT_IDS.BOOLEAN,
    load: () => import('../../common/converters').then((m) => m.BoolFormat),
  },
  {
    id: FIELD_FORMAT_IDS.BYTES,
    load: () => import('../../common/converters').then((m) => m.BytesFormat),
  },
  {
    id: FIELD_FORMAT_IDS.COLOR,
    load: () => import('../../common/converters').then((m) => m.ColorFormat),
  },

  {
    id: FIELD_FORMAT_IDS.DURATION,
    load: () => import('../../common/converters').then((m) => m.DurationFormat),
  },
  {
    id: FIELD_FORMAT_IDS.IP,
    load: () => import('../../common/converters').then((m) => m.IpFormat),
  },
  {
    id: FIELD_FORMAT_IDS.NUMBER,
    load: () => import('../../common/converters').then((m) => m.NumberFormat),
  },

  {
    id: FIELD_FORMAT_IDS.PERCENT,
    load: () => import('../../common/converters').then((m) => m.PercentFormat),
  },
  {
    id: FIELD_FORMAT_IDS.RELATIVE_DATE,
    load: () => import('../../common/converters').then((m) => m.RelativeDateFormat),
  },
  {
    id: FIELD_FORMAT_IDS._SOURCE,
    load: () => import('../../common/converters').then((m) => m.SourceFormat),
  },
  {
    id: FIELD_FORMAT_IDS.STATIC_LOOKUP,
    load: () => import('../../common/converters').then((m) => m.StaticLookupFormat),
  },

  {
    id: FIELD_FORMAT_IDS.STRING,
    load: () => import('../../common/converters').then((m) => m.StringFormat),
  },

  {
    id: FIELD_FORMAT_IDS.TRUNCATE,
    load: () => import('../../common/converters').then((m) => m.TruncateFormat),
  },
  {
    id: FIELD_FORMAT_IDS.URL,
    load: () => import('../../common/converters').then((m) => m.UrlFormat),
  },
  {
    id: FIELD_FORMAT_IDS.HISTOGRAM,
    load: () => import('../../common/converters').then((m) => m.HistogramFormat),
  },
];
